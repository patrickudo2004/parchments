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

                <div className="pt-4 border-t border-light-border dark:border-dark-border">
                    <p className="text-xs text-center text-light-text-disabled dark:text-dark-text-disabled">
                        Free forever • Offline-first • Privacy-focused
                    </p>
                </div>
            </div>
        </div>
    );
};
