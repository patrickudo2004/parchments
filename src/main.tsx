import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { useNoteStore } from './stores/noteStore'
import { useUIStore } from './stores/uiStore'
import { useBibleStore } from './stores/bibleStore'

if (typeof window !== 'undefined') {
    (window as any).useNoteStore = useNoteStore;
    (window as any).useUIStore = useUIStore;
    (window as any).useBibleStore = useBibleStore;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>,
)
