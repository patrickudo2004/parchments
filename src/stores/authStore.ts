import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/database';
import { dbHelpers } from '@/lib/db';
import bcrypt from 'bcryptjs';

interface AuthStore {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    setUser: (user: User | null) => void;
    logout: () => void;
    setLoading: (loading: boolean) => void;
    signup: (name: string, email: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,

            setUser: (user) =>
                set({ user, isAuthenticated: !!user }),

            logout: () =>
                set({ user: null, isAuthenticated: false }),

            setLoading: (loading) =>
                set({ isLoading: loading }),

            signup: async (name, email, password) => {
                set({ isLoading: true });
                try {
                    // Check if user already exists
                    const existingUser = await dbHelpers.getUserByEmail(email);
                    if (existingUser) {
                        throw new Error('An account with this email already exists');
                    }

                    // Hash password
                    const salt = await bcrypt.genSalt(10);
                    const passwordHash = await bcrypt.hash(password, salt);

                    // Create user
                    const newUser = await dbHelpers.createUser({
                        fullName: name,
                        email,
                        passwordHash,
                    });

                    set({ user: newUser, isAuthenticated: true, isLoading: false });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            login: async (email, password) => {
                set({ isLoading: true });
                try {
                    const user = await dbHelpers.getUserByEmail(email);
                    if (!user) {
                        throw new Error('No account found with this email');
                    }

                    const isValid = await bcrypt.compare(password, user.passwordHash);
                    if (!isValid) {
                        throw new Error('Invalid password');
                    }

                    set({ user, isAuthenticated: true, isLoading: false });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },
        }),
        {
            name: 'parchments-auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
