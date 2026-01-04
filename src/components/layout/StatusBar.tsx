import React from 'react';
import { useUIStore } from '@/stores/uiStore';

export const StatusBar: React.FC = () => {
    const { wordCount, characterCount } = useUIStore();

    return (
        <div className="h-8 bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border flex items-center justify-between px-4 text-xs text-light-text-secondary dark:text-dark-text-secondary shrink-0">
            <div className="flex items-center gap-4">
                <span>Ready</span>
                {wordCount > 0 && (
                    <>
                        <span>•</span>
                        <span className="font-medium">{wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}</span>
                        <span>•</span>
                        <span>{characterCount.toLocaleString()} {characterCount === 1 ? 'character' : 'characters'}</span>
                    </>
                )}
            </div>
            <span>UTF-8</span>
        </div>
    );
};
