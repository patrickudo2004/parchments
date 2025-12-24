import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';

export const SignupPage: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    const navigate = useNavigate();
    const { theme, toggleTheme } = useUIStore();
    const { signup } = useAuthStore();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setStatus('loading');

        try {
            await signup(name, email, password);
            setStatus('success');
            // Small delay to show success state before redirecting
            setTimeout(() => {
                navigate('/');
            }, 1000);
        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.message || 'An error occurred during signup');
            setStatus('idle');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-light-background dark:bg-dark-background transition-colors p-4">
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
                    <h1 className="text-3xl font-bold text-primary mb-2">Create Account</h1>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        Start your Bible study journey
                    </p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    <Input
                        type="text"
                        label="Full Name"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        icon={<PersonIcon fontSize="small" />}
                        required
                    />

                    <Input
                        type="email"
                        label="Email Address"
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

                    <Input
                        type="password"
                        label="Confirm Password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        icon={<LockIcon fontSize="small" />}
                        required
                    />

                    {error && (
                        <div className="p-3 bg-warning/10 border border-warning rounded-md">
                            <p className="text-sm text-warning">{error}</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="p-3 bg-secondary/10 border border-secondary rounded-md">
                            <p className="text-sm text-secondary">Account created successfully! Redirecting...</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full"
                        isLoading={status === 'loading'}
                        disabled={status === 'success'}
                    >
                        Sign Up
                    </Button>
                </form>

                <div className="text-center">
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary hover:underline font-medium">
                            Sign In
                        </Link>
                    </p>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-light-border dark:border-dark-border"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-light-surface dark:bg-dark-surface px-2 text-light-text-disabled dark:text-dark-text-disabled">
                            Or continue with
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Button variant="secondary" className="w-full bg-white dark:bg-dark-elevated text-black dark:text-white border-light-border dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-background">
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </Button>
                    <Button variant="secondary" className="w-full bg-black dark:bg-white text-white dark:text-black border-none hover:opacity-90">
                        <svg className="w-5 h-5 mr-2 fill-current" viewBox="0 0 24 24">
                            <path d="M17.05 20.28c-.96.95-2.04 1.72-3.12 1.72-1.2 0-1.56-.72-3-.72-1.44 0-1.87.72-3.04.72-1.01 0-2.26-.87-3.23-1.83-1.94-1.93-3.05-4.88-3.05-7.73 0-4.66 3.02-7.1 5.86-7.1 1.5 0 2.8 1.02 3.65 1.02.84 0 2.22-1.02 3.86-1.02 1.22 0 3.34.45 4.67 2.37-3.4 1.18-2.85 5.6-2.85 5.6 0 5.4 4.8 7.03 4.8 7.03-.02.04-.32.96-1.06 1.95zm-3.04-14.73c-.87 1.06-2.3 1.83-3.48 1.83-.17 0-.34-.02-.5-.04.14-2.5 2-4.63 3.48-4.63.17 0 .34.02.5.04.1.18.17.38.17.6 0 .84-.45 1.77-.17 2.2z" />
                        </svg>
                        Apple
                    </Button>
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
