import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { dbHelpers } from '@/lib/db';
import bcrypt from 'bcryptjs';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { theme, toggleTheme } = useUIStore();
    const { setUser } = useAuthStore();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Get user from database
            const userSetting = await dbHelpers.getSetting('user');

            if (!userSetting) {
                setError('No account found. Please sign up first.');
                setIsLoading(false);
                return;
            }

            // Verify password
            const isValid = await bcrypt.compare(password, userSetting.passwordHash);

            if (!isValid) {
                setError('Invalid email or password');
                setIsLoading(false);
                return;
            }

            // Set user in auth store
            setUser(userSetting);

        } catch (err) {
            console.error('Login error:', err);
            setError('An error occurred during login');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-light-background dark:bg-dark-background transition-colors">
            <div className="absolute top-4 right-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    icon={theme === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
                    aria-label="Toggle theme"
                >
                    {theme === 'light' ? 'Dark' : 'Light'}
                </Button>
            </div>

            <div className="card w-full max-w-md p-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary mb-2">Parchments</h1>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        Bible Study & Sermon Management
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                        type="email"
                        label="Email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        icon={<EmailIcon fontSize="small" />}
                        required
                    />

                    <Input
                        type="password"
                        label="Password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon={<LockIcon fontSize="small" />}
                        required
                    />

                    {error && (
                        <div className="p-3 bg-warning/10 border border-warning rounded-md">
                            <p className="text-sm text-warning">{error}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full"
                        isLoading={isLoading}
                    >
                        Sign In
                    </Button>
                </form>

                <div className="text-center">
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Don't have an account?{' '}
                        <a href="/signup" className="text-primary hover:underline font-medium">
                            Sign Up
                        </a>
                    </p>
                </div>

                <div className="pt-4 border-t border-light-border dark:border-dark-border">
                    <p className="text-xs text-center text-light-text-disabled dark:text-dark-text-disabled">
                        Free forever • Offline-first • Privacy-focused
                    </p>
                </div>
            </div>
        </div>
    );
};
