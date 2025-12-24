import React, { useEffect } from 'react';
import { LoginPage } from '@/components/auth/LoginPage';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

function App() {
  const { isAuthenticated } = useAuthStore();
  const { theme } = useUIStore();

  // Initialize theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background">
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-4">Welcome to Parchments!</h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Main application coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
