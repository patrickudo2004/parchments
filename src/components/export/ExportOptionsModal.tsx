import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import type { BibleVersion } from '@/types/database';

interface ExportOptionsModalProps {
    isOpen: boolean;
    format: 'docx' | 'pdf' | 'md' | 'html' | 'txt';
    onConfirm: (options: { includeScripture: boolean; bibleVersion: string }) => void;
    onCancel: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
    docx: 'Word Document (.docx)',
    pdf: 'PDF Document (.pdf)',
    md: 'Markdown (.md)',
    html: 'HTML File (.html)',
    txt: 'Plain Text (.txt)'
};

export const ExportOptionsModal: React.FC<ExportOptionsModalProps> = ({
    isOpen,
    format,
    onConfirm,
    onCancel
}) => {
    const [includeScripture, setIncludeScripture] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState('KJV');
    const [availableVersions, setAvailableVersions] = useState<BibleVersion[]>([]);

    useEffect(() => {
        const loadVersions = async () => {
            const versions = await db.bibleVersions.toArray();
            setAvailableVersions(versions);

            // Set default to KJV if available, otherwise first version
            const kjv = versions.find(v => v.abbreviation === 'KJV');
            if (kjv) {
                setSelectedVersion(kjv.id);
            } else if (versions.length > 0) {
                setSelectedVersion(versions[0].id);
            }
        };

        if (isOpen) {
            loadVersions();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm({
            includeScripture,
            bibleVersion: selectedVersion
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl border border-light-border dark:border-dark-border w-full max-w-md mx-4">
                {/* Header */}
                <div className="px-6 py-4 border-b border-light-border dark:border-dark-border">
                    <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                        Export Options
                    </h2>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                        Exporting as {FORMAT_LABELS[format]}
                    </p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-6">
                    {/* Include Scripture Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={includeScripture}
                            onChange={(e) => setIncludeScripture(e.target.checked)}
                            className="mt-1 w-4 h-4 rounded border-light-border dark:border-dark-border text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <div className="flex-1">
                            <div className="font-medium text-light-text dark:text-dark-text group-hover:text-primary transition-colors">
                                Include Scripture Text
                            </div>
                            <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-0.5">
                                Add full verse text inline with scripture references
                            </div>
                        </div>
                    </label>

                    {/* Bible Version Selector */}
                    {includeScripture && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                                Bible Version
                            </label>
                            <select
                                value={selectedVersion}
                                onChange={(e) => setSelectedVersion(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-background text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                {availableVersions.map(version => (
                                    <option key={version.id} value={version.id}>
                                        {version.name} ({version.abbreviation})
                                    </option>
                                ))}
                            </select>
                            {availableVersions.length === 0 && (
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    No Bible versions available. Scripture text will be skipped.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-light-border dark:border-dark-border flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-background dark:hover:bg-dark-background transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        Export
                    </button>
                </div>
            </div>
        </div>
    );
};
