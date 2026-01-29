import React, { useState, useRef, useEffect } from 'react';
import { useNoteStore } from '@/stores/noteStore';
import { useAIStore } from '@/stores/aiStore';
import { useUIStore } from '@/stores/uiStore';
import {
    Sparkles,
    Brain,
    Loader2,
    ListChecks,
    Send,
    Trash2,
    Download,
    ShieldCheck,
    ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

export const AssistantSidebar: React.FC = () => {
    const { currentNote } = useNoteStore();
    const { toggleSettingsModal } = useUIStore();
    const {
        isAIFeaturesEnabled,
        isGenerativeModelDownloaded,
        chatHistory,
        isChatting,
        sendMessage,
        clearChat,
        downloadGenerativeModel,
        isGenerativeModelLoading,
        downloadProgress
    } = useAIStore();

    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory, isChatting]);

    const handleSend = async () => {
        if (!inputValue.trim() || isChatting) return;
        const text = inputValue;
        setInputValue('');
        await sendMessage(text);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 1. Off-by-default / Not Enabled state
    if (!isAIFeaturesEnabled) {
        return (
            <div className="flex flex-col h-full bg-light-surface dark:bg-dark-surface p-8 text-center text-light-text-secondary">
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                        <Brain size={40} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-lg font-black uppercase tracking-tight text-light-text-primary dark:text-dark-text-primary">Local Intelligence</h2>
                        <p className="text-xs leading-relaxed">
                            Activate conversational research, sermon outlining, and deep verse analysis.
                            Built for privacy, powered by your machine.
                        </p>
                    </div>
                    <button
                        onClick={toggleSettingsModal}
                        className="px-8 py-3 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        Enable in Settings <ArrowRight size={14} />
                    </button>
                    <div className="flex items-center gap-2 text-[10px] text-light-text-disabled font-bold uppercase tracking-widest pt-4">
                        <ShieldCheck size={14} className="text-green-600/50" />
                        <span>100% Private & Offline</span>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Enabled but not downloaded state
    if (!isGenerativeModelDownloaded) {
        return (
            <div className="flex flex-col h-full bg-light-surface dark:bg-dark-surface p-8 text-center">
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Download size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-base font-black uppercase tracking-tight text-light-text-primary dark:text-dark-text-primary">Download Required</h2>
                        <p className="text-xs text-light-text-secondary leading-relaxed">
                            To use the assistant, you need to download the local engine (~270MB).
                            This is a one-time setup.
                        </p>
                    </div>

                    {isGenerativeModelLoading ? (
                        <div className="w-full space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                                <span>Downloading Engine...</span>
                                <span>{Math.round(downloadProgress * 100)}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${downloadProgress * 100}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={downloadGenerativeModel}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
                        >
                            <Download size={14} /> Get Engine Now
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-light-surface dark:bg-dark-surface overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-light-background/40 dark:bg-dark-background/20 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2 text-primary">
                    <Sparkles size={16} className="animate-pulse" />
                    <h2 className="text-[10px] font-black uppercase tracking-widest">Exegesis Assistant</h2>
                </div>
                {chatHistory.length > 0 && (
                    <button
                        onClick={clearChat}
                        className="p-1 px-2 hover:bg-red-500/10 text-red-500 rounded-md transition-all flex items-center gap-1.5"
                    >
                        <Trash2 size={12} />
                        <span className="text-[9px] font-black uppercase tracking-widest">Clear</span>
                    </button>
                )}
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-b border-light-border dark:border-dark-border bg-light-surface/50 dark:bg-dark-surface/50 shrink-0">
                {[
                    { label: 'Outline Sermon', icon: ListChecks, prompt: 'Create a structured three-point sermon outline based on this content.' },
                    { label: 'Summarize Note', icon: Sparkles, prompt: 'Provide a concise theological summary of this note.' },
                    { label: 'Explain Terms', icon: Brain, prompt: 'Identify and explain any difficult theological terms or historical contexts in this text.' }
                ].map((action, i) => (
                    <button
                        key={i}
                        onClick={() => sendMessage(action.prompt)}
                        disabled={isChatting}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-white/5 border border-light-border dark:border-dark-border hover:border-primary/50 transition-all whitespace-nowrap group disabled:opacity-50"
                    >
                        <action.icon size={12} className="text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold uppercase tracking-tight text-light-text-secondary group-hover:text-primary transition-colors">
                            {action.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar scroll-smooth"
            >
                {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60 px-4">
                        <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-light-border dark:border-dark-border shadow-sm">
                            <Brain size={32} className="text-light-text-disabled" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary uppercase tracking-widest">Study Partner Ready</p>
                            <p className="text-[11px] text-light-text-secondary leading-relaxed">
                                Ask about a passage, request an outline, or summarize your notes.
                                Everything stays local.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 w-full">
                            {[
                                "Summarize my current note",
                                "Outline a sermon on Ephesians 2",
                                "Explain the historical context of the parables"
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setInputValue(suggestion);
                                        // handleSend(); // Optional: immediate send
                                    }}
                                    className="text-[10px] font-semibold text-light-text-secondary hover:text-primary p-2 border border-light-border dark:border-dark-border rounded-xl hover:border-primary/30 transition-all text-left bg-light-background/20"
                                >
                                    "{suggestion}"
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {chatHistory.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                            >
                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-[11px] leading-relaxed shadow-sm border ${msg.role === 'user'
                                    ? 'bg-primary text-white border-primary shadow-primary/10'
                                    : 'bg-white dark:bg-black/20 text-light-text-primary dark:text-dark-text-primary border-light-border dark:border-dark-border'
                                    }`}>
                                    {msg.content}
                                    {!msg.content && msg.role === 'assistant' && isChatting && (
                                        <div className="flex gap-1 py-1">
                                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-[9px] font-bold text-light-text-disabled uppercase tracking-widest mt-2 px-1 opacity-50">
                                    {msg.role === 'user' ? 'You' : 'Assistant'}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-light-border dark:border-dark-border bg-light-background/40 dark:bg-dark-background/20 backdrop-blur-md shrink-0">
                <div className="relative group">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a research question..."
                        rows={1}
                        className="w-full p-3.5 pr-14 bg-white dark:bg-black/30 border border-light-border dark:border-dark-border rounded-2xl text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none max-h-32 transition-all placeholder:text-light-text-disabled"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isChatting}
                        className={`absolute right-2.5 bottom-2.5 p-2 rounded-xl transition-all ${inputValue.trim() && !isChatting
                            ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105'
                            : 'text-light-text-disabled bg-transparent'
                            }`}
                    >
                        {isChatting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                </div>
                <div className="mt-2.5 flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-light-text-disabled uppercase tracking-widest">
                        <ShieldCheck size={12} className="text-green-600/50" />
                        <span>Private Local Inference</span>
                    </div>
                    {currentNote && (
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                            <span>Note Context Active</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
