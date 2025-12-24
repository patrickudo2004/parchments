import React from 'react';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

export const StatusBar: React.FC = () => {
    return (
        <footer className="h-6 bg-light-sidebar dark:bg-dark-sidebar border-t border-light-border dark:border-dark-border flex items-center justify-between px-4 text-[10px] font-medium text-light-text-secondary dark:text-dark-text-secondary">
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                    <CheckCircleOutlineIcon sx={{ fontSize: 12 }} className="text-secondary" />
                    <span>Saved to local-storage</span>
                </div>

                <div className="flex items-center space-x-2">
                    <span>Words: 0</span>
                    <span>Pages: 1</span>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <button className="hover:text-primary transition-colors">
                        <ZoomOutIcon sx={{ fontSize: 14 }} />
                    </button>
                    <span>100%</span>
                    <button className="hover:text-primary transition-colors">
                        <ZoomInIcon sx={{ fontSize: 14 }} />
                    </button>
                </div>

                <div className="flex items-center space-x-1">
                    <span>English (US)</span>
                </div>
            </div>
        </footer>
    );
};
