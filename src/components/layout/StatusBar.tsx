import { useUIStore } from '@/stores/uiStore';
import { useAIStore } from '@/stores/aiStore';
import { useSyncStore } from '@/stores/syncStore';
import { Brain, Sparkles, Loader2 } from 'lucide-react';

export const StatusBar: React.FC = () => {
    const { wordCount, characterCount } = useUIStore();
    const { statusMessage, isIndexing, indexingProgress, isModelLoaded, isInitializing } = useAIStore();
    const { deviceName } = useSyncStore();

    return (
        <div className="h-8 bg-light-surface dark:bg-dark-surface border-t border-light-border dark:border-dark-border flex items-center justify-between px-4 text-[10px] text-light-text-secondary dark:text-dark-text-secondary shrink-0 font-bold uppercase tracking-widest">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-primary">
                    {isInitializing || isIndexing ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : isModelLoaded ? (
                        <Brain size={12} />
                    ) : (
                        <Sparkles size={12} className="opacity-50" />
                    )}
                    <span>{isIndexing ? `Indexing (${Math.round(indexingProgress * 100)}%)` : statusMessage}</span>
                </div>

                <div className="w-[1px] h-3 bg-light-border dark:border-dark-border mx-1" />

                {wordCount > 0 && (
                    <div className="flex items-center gap-2">
                        <span>{wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}</span>
                        <span className="opacity-30">•</span>
                        <span>{characterCount.toLocaleString()} {characterCount === 1 ? 'character' : 'characters'}</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 opacity-40">
                    <div className="w-1.5 h-1.5 rounded-full bg-light-text-disabled" />
                    <span>{deviceName}</span>
                </div>
                <span className="opacity-30">•</span>
                <span>UTF-8</span>
                <span className="opacity-30">•</span>
                <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${isModelLoaded ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <span>Local AI</span>
                </div>
            </div>
        </div>
    );
};
