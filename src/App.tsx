import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Routes, Route } from 'react-router-dom';
import { EditorContainer } from '@/components/editor/EditorContainer';

const App: React.FC = () => {
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
