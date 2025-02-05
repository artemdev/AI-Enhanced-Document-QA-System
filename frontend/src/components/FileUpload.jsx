import { useCallback, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

import { useDropzone } from 'react-dropzone'

export default function FileUpload() {
    const [uploading, setUploading] = useState(false)

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0]
        const formData = new FormData()

        formData.append('file', file)

        setUploading(true)

        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL}/upload`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            )

            toast.success('File uploaded successfully')
        } catch (error) {
            toast.error(error)
        }

        setUploading(false)
    }, [])

    const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
        useDropzone({
            onDrop,
        })

    return (
        <section className="files-container">
            <div {...getRootProps({ className: 'dropzone' })}>
                <input {...getInputProps()} />
                {uploading ? (
                    'Uploading ...'
                ) : isDragActive ? (
                    <p>Drop the files here ...</p>
                ) : (
                    <>
                        <p>
                            Drag drop some files here, or click to select files
                        </p>
                        {acceptedFiles.length > 0 && (
                            <ul className="files">
                                {acceptedFiles.map((file) => (
                                    <li key={file.path}>{file.name}</li>
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </section>
    )
}
