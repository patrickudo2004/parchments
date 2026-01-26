import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PinItem {
    id: string;
    type: 'verse' | 'lexicon' | 'note';
    title: string;
    content: string; // HTML or Markdown content to be inserted
    reference: string; // Human readable ref (e.g., "John 3:16" or "G2424")
    sourceIds?: string[]; // IDs of individual items included in this pin
    metadata: any;
    timestamp: number;
}

interface ResearchStore {
    pins: PinItem[];
    pinItem: (item: Omit<PinItem, 'timestamp'>) => void;
    unpinItem: (id: string) => void;
    clearPins: () => void;
    isItemPinned: (id: string) => boolean;
}

export const useResearchStore = create<ResearchStore>()(
    persist(
        (set, get) => ({
            pins: [],

            pinItem: (item) => {
                const { pins } = get();
                if (pins.some(p => p.id === item.id)) return;

                set({
                    pins: [
                        { ...item, timestamp: Date.now() },
                        ...pins
                    ]
                });
            },

            unpinItem: (id) => {
                set((state) => ({
                    pins: state.pins.filter(p => p.id !== id)
                }));
            },

            clearPins: () => set({ pins: [] }),

            isItemPinned: (id) => {
                const { pins } = get();
                return pins.some(p => p.id === id || p.sourceIds?.includes(id));
            }
        }),
        {
            name: 'parchments-research-pins',
        }
    )
);
