import React from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import AddIcon from '@mui/icons-material/Add';
import MicIcon from '@mui/icons-material/Mic';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import GTranslateIcon from '@mui/icons-material/GTranslate';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { ProfileModal } from '../profile/ProfileModal';

export const TopBar: React.FC = () => {
    const { user, logout } = useAuthStore();
    const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);



    return (
        <header className="h-12 bg-light-surface dark:bg-dark-surface border-b border-light-border dark:border-dark-border flex items-center justify-between px-4 z-50">
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                        <span className="text-white font-bold">P</span>
                    </div>
                    <span className="font-bold text-lg text-primary hidden sm:block">Parchments</span>
                </div>

                <div className="h-6 w-[1px] bg-light-border dark:border-dark-border mx-2" />

                <div className="flex items-center space-x-1">
                    <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary truncate max-w-[200px]">
                        Untitled Note
                    </span>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="hidden md:flex items-center space-x-1 mr-4">
                    <Button variant="ghost" size="sm" icon={<AddIcon fontSize="small" />} title="New Note" onClick={() => { }}>Note</Button>
                    <Button variant="ghost" size="sm" icon={<MicIcon fontSize="small" />} title="New Voice Note" onClick={() => { }}>Voice</Button>
                    <Button variant="ghost" size="sm" icon={<MenuBookIcon fontSize="small" />} title="Bible" onClick={() => { }}>Bible</Button>
                    <Button variant="ghost" size="sm" icon={<GTranslateIcon fontSize="small" />} title="Strong's" onClick={() => { }}>Strong's</Button>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center space-x-2 p-1 rounded-full hover:bg-light-background dark:hover:bg-dark-background transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-light-sidebar dark:bg-dark-sidebar flex items-center justify-center text-primary overflow-hidden">
                            {user?.fullName ? (
                                <span className="font-medium">{user.fullName.charAt(0)}</span>
                            ) : (
                                <AccountCircleIcon />
                            )}
                        </div>
                    </button>

                    {isUserMenuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsUserMenuOpen(false)}
                            />
                            <div className="absolute right-0 mt-2 w-56 card shadow-lg p-2 z-50 animate-in fade-in zoom-in duration-200">
                                <div className="px-3 py-2 border-b border-light-border dark:border-dark-border mb-1">
                                    <p className="text-sm font-bold truncate">{user?.fullName || 'User'}</p>
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">
                                        {user?.email}
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        setIsProfileModalOpen(true);
                                        setIsUserMenuOpen(false);
                                    }}
                                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-md hover:bg-light-background dark:hover:bg-dark-background transition-colors"
                                >
                                    <SettingsIcon fontSize="small" />
                                    <span>Profile Settings</span>
                                </button>

                                <button
                                    onClick={() => logout()}
                                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-warning rounded-md hover:bg-warning/10 transition-colors"
                                >
                                    <LogoutIcon fontSize="small" />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </header>
    );
};
