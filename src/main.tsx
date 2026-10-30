import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/merriweather/300.css'
import '@fontsource/merriweather/400.css'
import '@fontsource/merriweather/700.css'
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
