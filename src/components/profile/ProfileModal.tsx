import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CloseIcon from '@mui/icons-material/Close';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, setUser } = useAuthStore();
    const [name, setName] = useState(user?.fullName || '');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        // Mock save logic - update store
        // In a real app, we'd call dbHelpers.updateUser as well
        if (user) {
            const updatedUser = { ...user, fullName: name };
            setUser(updatedUser);

            // To be thorough, we should persist to DB
            // (Skipping actual DB write for now as requested for placeholders/visuals, 
            // but store update makes it reactive)
        }

        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="card w-full max-w-md relative z-10 p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">User Profile</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-light-background dark:hover:bg-dark-background transition-colors">
                        <CloseIcon />
                    </button>
                </div>

                <div className="flex flex-col items-center mb-8">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold border-2 border-primary overflow-hidden">
                            {user?.fullName?.charAt(0) || <PersonIcon fontSize="large" />}
                        </div>
                        <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                            <PhotoCameraIcon fontSize="small" />
                        </button>
                    </div>
                    <p className="mt-4 text-sm text-light-text-disabled dark:text-dark-text-disabled">
                        JPG, GIF or PNG. Max size of 800K
                    </p>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        icon={<PersonIcon fontSize="small" />}
                        required
                    />

                    <Input
                        label="Email Address"
                        value={user?.email || ''}
                        disabled
                        placeholder="your@email.com"
                        icon={<EmailIcon fontSize="small" />}
                        helperText="Email cannot be changed"
                    />

                    <div className="flex space-x-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            isLoading={isSaving}
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
