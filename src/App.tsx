import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { EditorContainer } from '@/components/editor/EditorContainer';
import { seedBibleData } from '@/lib/db/bibleSeed';
import { popoutService } from '@/lib/utils/popoutService';
import { BibleReader } from '@/components/bible/BibleReader';
import { LexiconSidebar } from '@/components/bible/LexiconSidebar';
import { ResearchSidebar } from '@/components/bible/ResearchSidebar';

import { JoinHandler } from '@/components/sync/JoinHandler';
import { useSpaceSync } from '@/hooks/useSpaceSync';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { LandingPage } from '@/components/marketing/LandingPage';
import { UserGuide } from '@/components/marketing/UserGuide';
import { PrivacyPolicy } from '@/components/marketing/PrivacyPolicy';
import { TermsOfService } from '@/components/marketing/TermsOfService';
import { useNoteStore } from '@/stores/noteStore';

const App: React.FC = () => {
    useSpaceSync();
    useVersionCheck();

    useEffect(() => {
        seedBibleData().catch(err => console.error('Failed to seed Bible data:', err));
        
        // Load initial DB notes and folders for database mode / mobile sandbox
        const { loadNotes, loadFolders } = useNoteStore.getState();
        loadNotes().catch(err => console.error('Failed to load notes:', err));
        loadFolders().catch(err => console.error('Failed to load folders:', err));
    }, []);

    const isDesktop = !!(window as any).__TAURI__;
    const isPopout = popoutService.isPopout();
    const popoutType = popoutService.getPopoutType();

    if (isPopout) {
        return (
            <div className="h-screen bg-light-background dark:bg-dark-background text-light-text-primary dark:text-dark-text-primary">
                {popoutType === 'bible' && <BibleReader isIndependent={true} />}
                {popoutType === 'lexicon' && <LexiconSidebar isIndependent={true} />}
                {popoutType === 'pins' && <ResearchSidebar isIndependent={true} />}
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/" element={
                isDesktop ? <Navigate to="/app" replace /> : <LandingPage />
            } />
            <Route path="/app/*" element={
                <MainLayout>
                    <EditorContainer />
                </MainLayout>
            } />
            <Route path="/guide" element={<UserGuide />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/join/*" element={<JoinHandler />} />
            <Route path="*" element={
                <div className="p-8 font-mono text-xs">
                    <h1 className="text-red-500 font-bold mb-4">No Route Matched</h1>
                    <p>Pathname: {window.location.pathname}</p>
                    <p>Search: {window.location.search}</p>
                    <p>Hash: {window.location.hash}</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded"
                    >
                        Go Home
                    </button>
                </div>
            } />
        </Routes>
    );
};

export default App;
