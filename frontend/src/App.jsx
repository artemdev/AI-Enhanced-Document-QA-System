import { ToastContainer } from 'react-toastify'
import FileUpload from './components/FileUpload'
import Chat from './components/Chat'

import './App.css'

function App() {
    return (
        <div>
            <ToastContainer />

            <div className="app-container">
                <FileUpload />

                <Chat />
            </div>
        </div>
    )
}

export default App
