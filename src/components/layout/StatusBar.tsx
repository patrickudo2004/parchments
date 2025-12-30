import React from 'react';

export const StatusBar: React.FC = () => {
    return (
        <div className="h-8 bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border flex items-center justify-between px-4 text-xs text-light-text-secondary dark:text-dark-text-secondary shrink-0">
            <span>Ready</span>
            <span>UTF-8</span>
        </div>
    );
};
