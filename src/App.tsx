import React from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Routes, Route } from 'react-router-dom';

const App: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<MainLayout />} />
        </Routes>
    );
};

export default App;
