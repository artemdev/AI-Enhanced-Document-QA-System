import { fileURLToPath } from 'url'
import { dirname } from 'path'
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'

// Third-party modules
import express from 'express'
import createError from 'http-errors'
import multer from 'multer'
import { z } from 'zod'
import dotenv from 'dotenv'
import cors from 'cors'

// LangChain and related modules
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { CharacterTextSplitter } from '@langchain/textsplitters'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf'
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents'
import { createRetrievalChain } from 'langchain/chains/retrieval'
import { Pinecone } from '@pinecone-database/pinecone'
import { PineconeStore } from '@langchain/pinecone'
import { createMetadataTaggerFromZod } from 'langchain/document_transformers/openai_functions'

// Load environment variables
dotenv.config()

// Set up __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Initialize Express app
const app = express()
const storeImage = path.join(__dirname, 'uploads')

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, storeImage),
    filename: (req, file, cb) => cb(null, file.originalname),
})
const upload = multer({ storage })

// Routes
app.post('/upload', upload.any(), async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No file was uploaded.' })
        }

        const llm = new ChatOpenAI({
            model: 'gpt-3.5-turbo-1106',
            temperature: 0,
        })
        const pinecone = new Pinecone()
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX)

        const zodSchema = z.object({
            technologies: z
                .optional(z.string())
                .describe(
                    'Technologies listed. Example: react, javascript, html.'
                ),
            company_name: z
                .optional(z.string())
                .describe(
                    'Name of the companies. Example: google, microsoft, amazon.'
                ),
        })

        const metadataTagger = createMetadataTaggerFromZod(zodSchema, { llm })

        const { path: temporaryName, originalname } = req.files[0]
        const fileName = path.join(storeImage, originalname)
        const loader = new PDFLoader(fileName, { parsedItemSeparator: ' ' })

        const doc = await loader.load()
        const docText = doc[0].pageContent

        const textSplitter = new CharacterTextSplitter({
            separator: ' ',
            chunkSize: 1536,
            chunkOverlap: 200,
        })

        const texts = await textSplitter.splitText(docText)
        const documents = await textSplitter.createDocuments(texts)
        const taggedDocuments = await metadataTagger.transformDocuments(
            documents
        )

        await PineconeStore.fromDocuments(
            taggedDocuments,
            new OpenAIEmbeddings(),
            {
                pineconeIndex,
                maxConcurrency: 5,
            }
        )

        try {
            await fs.promises.rename(temporaryName, fileName)
        } catch (err) {
            await fs.promises.unlink(temporaryName)
            return next(err)
        }

        return res.json({ message: 'File successfully uploaded', status: 200 })
    } catch (err) {
        next(err)
    }
})

app.get('/', async (req, res) => {
    return res.json({ message: 'Hello World', status: 200 })
})

app.post('/question', upload.none(), async (req, res, next) => {
    const { question } = req.body

    if (!question) {
        return res.status(400).json({ message: 'No question provided.' })
    }

    try {
        const pinecone = new Pinecone()
        const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX)

        const llm = new ChatOpenAI({
            model: 'gpt-3.5-turbo-1106',
            temperature: 0,
        })

        const vectorStore = await PineconeStore.fromExistingIndex(
            new OpenAIEmbeddings(),
            { pineconeIndex }
        )

        const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
            [
                'system',
                "Answer the user's questions based on the below context:\n\n{context}",
            ],
            ['human', '{input}'],
        ])

        const combineDocsChain = await createStuffDocumentsChain({
            llm,
            prompt: questionAnsweringPrompt,
        })

        const chain = await createRetrievalChain({
            retriever: vectorStore.asRetriever(),
            combineDocsChain,
        })

        const chainResponse = await chain.invoke({ input: question })

        return res.json({ answer: chainResponse.answer, status: 200 })
    } catch (err) {
        next(err)
    }
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send('Error occurred, see logs for more details')
})

// 404 handler
app.use((req, res, next) => {
    next(createError(404))
})

// Start the server
const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})
