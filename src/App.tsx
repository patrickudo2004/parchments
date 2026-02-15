import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { EditorContainer } from '@/components/editor/EditorContainer';
import { seedBibleData } from '@/lib/db/bibleSeed';
import { popoutService } from '@/lib/utils/popoutService';
import { BibleReader } from '@/components/bible/BibleReader';
import { LexiconSidebar } from '@/components/bible/LexiconSidebar';
import { AssistantSidebar } from '@/components/bible/AssistantSidebar';
import { ResearchSidebar } from '@/components/bible/ResearchSidebar';

import { JoinHandler } from '@/components/sync/JoinHandler';
import { useSpaceSync } from '@/hooks/useSpaceSync';

const App: React.FC = () => {
    useSpaceSync();

    useEffect(() => {
        seedBibleData().catch(err => console.error('Failed to seed Bible data:', err));
    }, []);

    const isPopout = popoutService.isPopout();
    const popoutType = popoutService.getPopoutType();

    if (isPopout) {
        return (
            <div className="h-screen bg-light-background dark:bg-dark-background text-light-text-primary dark:text-dark-text-primary">
                {popoutType === 'bible' && <BibleReader isIndependent={true} />}
                {popoutType === 'lexicon' && <LexiconSidebar isIndependent={true} />}
                {popoutType === 'assistant' && <AssistantSidebar isIndependent={true} />}
                {popoutType === 'pins' && <ResearchSidebar isIndependent={true} />}
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/" element={
                <MainLayout>
                    <EditorContainer />
                </MainLayout>
            } />
            <Route path="/join/*" element={<JoinHandler />} />
            <Route path="*" element={
                <div className="p-8 font-mono text-xs">
                    <h1 className="text-red-500 font-bold mb-4">No Route Matched</h1>
                    <p>Pathname: {window.location.pathname}</p>
                    <p>Search: {window.location.search}</p>
                    <p>Hash: {window.location.hash}</p>
                </div>
            } />
        </Routes>
    );
};

export default App;
