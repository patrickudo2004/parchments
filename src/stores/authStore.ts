import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/database';
// import { dbHelpers } from '@/lib/db'; // Removed implementation details to keep store simple if auth removed
// Keeping minimal auth store structure for compatibility if needed, or remove completely?
// User wanted removal of "Login Page". But maybe "Auth Store" is still useful for "Profile"?
// Let's keep it minimal.

interface AuthStore {
    user: User | null;
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            user: null, // No user by default (offline mode)
            isAuthenticated: false,
            setUser: (user) => set({ user, isAuthenticated: !!user }),
            logout: () => set({ user: null, isAuthenticated: false }),
        }),
        {
            name: 'parchments-auth',
        }
    )
);
