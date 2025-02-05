import { useState } from 'react'
import axios from 'axios'

import { toast } from 'react-toastify'

export default function Chat() {
    const [question, setQuestion] = useState('')
    const [answer, setAnswer] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()

        setIsLoading(true)

        try {
            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL}/question`,
                { question },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )

            setAnswer(data.answer)
        } catch {
            toast.error('An error occurred while sending the question')
        }

        setIsLoading(false)
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="chat">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    required
                />

                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Asking' : 'Ask'}
                </button>
            </form>

            {answer && (
                <div className="answer">
                    <h3>Answer:</h3>
                    <p>{answer}</p>
                </div>
            )}
        </>
    )
}
