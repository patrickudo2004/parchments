import React, { useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Routes, Route } from 'react-router-dom';
import { EditorContainer } from '@/components/editor/EditorContainer';
import { seedBibleData } from '@/lib/db/bibleSeed';

const App: React.FC = () => {
    useEffect(() => {
        seedBibleData().catch(err => console.error('Failed to seed Bible data:', err));
    }, []);

    return (
        <Routes>
            <Route path="/" element={
                <MainLayout>
                    <EditorContainer />
                </MainLayout>
            } />
        </Routes>
    );
};

export default App;
