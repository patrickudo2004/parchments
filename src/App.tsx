import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/components/auth/LoginPage';
import { SignupPage } from '@/components/auth/SignupPage';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const { theme } = useUIStore();

  // Initialize theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="max-w-4xl w-full text-center">
                    <h1 className="text-4xl font-bold text-primary mb-4">Welcome to Parchments!</h1>
                    <p className="text-lg text-light-text-secondary dark:text-dark-text-secondary mb-8">
                      Your offline-first sanctuary for Bible study and sermon preparation.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="card p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                          <span className="text-2xl font-bold">1</span>
                        </div>
                        <h3 className="font-bold mb-2">Create a Note</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          Start typing your sermons or study notes with rich text formatting.
                        </p>
                      </div>

                      <div className="card p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                          <span className="text-2xl font-bold">2</span>
                        </div>
                        <h3 className="font-bold mb-2">Insert Scripture</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          Reference Bible verses directly in your notes and view context instantly.
                        </p>
                      </div>

                      <div className="card p-6 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                          <span className="text-2xl font-bold">3</span>
                        </div>
                        <h3 className="font-bold mb-2">Voice Dictation</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          Capture your inspirations via voice and let Parchments transcribe them.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
