import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, BookOpen, Loader2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useBibleStore } from '@/stores/bibleStore';
import { useUIStore } from '@/stores/uiStore';
import type { BibleVerse, BibleVersion } from '@/types/database';
import { parseVerseSegments } from '@/lib/scriptureParser';

export interface PulpitScriptureTarget {
    book: string;
    chapter: number;
    verse: number;
    verseEnd?: number;
    segments?: string | null;
}

interface PulpitScriptureModalProps {
    target: PulpitScriptureTarget | null;
    onClose: () => void;
    themeMode?: 'light' | 'dark' | 'contrast';
}

export const PulpitScriptureModal: React.FC<PulpitScriptureModalProps> = ({
    target,
    onClose,
    themeMode = 'dark',
}) => {
    const { mainVersion } = useBibleStore();
    const bibleVersions = useLiveQuery(() => db.bibleVersions.toArray()) || [];
    const installedVersions = bibleVersions.filter((v: BibleVersion) => v.isDownloaded);
    const { isMobile, showToast } = useUIStore();
    const [selectedVersion, setSelectedVersion] = useState<string>(mainVersion || 'KJV');
    const [verses, setVerses] = useState<{ verse: number; text: string; omittedBeforeNotice?: string | null }[]>([]);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeVersionBadge, setActiveVersionBadge] = useState<string>(mainVersion || 'KJV');

    useEffect(() => {
        if (!target) return;

        let isCancelled = false;
        setLoading(true);

        const fetchPassage = async () => {
            try {
                const { book, chapter, verse, verseEnd, segments } = target;

                const parsedSegments = segments
                    ? parseVerseSegments(segments)
                    : [{ verse, verseEnd: verseEnd && verseEnd > verse ? verseEnd : null }];

                let activeVer = selectedVersion;
                const resultVerses: { verse: number; text: string; omittedBeforeNotice?: string | null }[] = [];

                // Check if selectedVersion has verses for this book/chapter
                let checkCount = await db.bibleVerses
                    .where('[versionId+book+chapter]')
                    .equals([selectedVersion, book, chapter])
                    .count();

                if (checkCount === 0 && selectedVersion !== 'KJV') {
                    activeVer = 'KJV';
                }

                const { decryptVerses } = await import('@/lib/bible/bibleCryptoService');

                for (let idx = 0; idx < parsedSegments.length; idx++) {
                    const seg = parsedSegments[idx];
                    let omittedBeforeNotice: string | null = null;

                    if (idx > 0) {
                        const prevSeg = parsedSegments[idx - 1];
                        const prevEnd = prevSeg.verseEnd || prevSeg.verse;
                        const currentStart = seg.verse;
                        if (currentStart > prevEnd + 1) {
                            if (currentStart === prevEnd + 2) {
                                omittedBeforeNotice = `v. ${prevEnd + 1} omitted`;
                            } else {
                                omittedBeforeNotice = `vv. ${prevEnd + 1}–${currentStart - 1} omitted`;
                            }
                        }
                    }

                    let segVerses: BibleVerse[] = [];
                    if (seg.verseEnd && seg.verseEnd > seg.verse) {
                        segVerses = await db.bibleVerses
                            .where('[versionId+book+chapter]')
                            .equals([activeVer, book, chapter])
                            .and(v => v.verse >= seg.verse && v.verse <= seg.verseEnd!)
                            .sortBy('verse');
                    } else {
                        const v = await db.bibleVerses
                            .where('[versionId+book+chapter+verse]')
                            .equals([activeVer, book, chapter, seg.verse])
                            .first();
                        if (v) segVerses = [v];
                    }

                    // Fallback to KJV if specific segment not found in active translation (Rule 1)
                    if (segVerses.length === 0 && activeVer !== 'KJV') {
                        if (seg.verseEnd && seg.verseEnd > seg.verse) {
                            segVerses = await db.bibleVerses
                                .where('[versionId+book+chapter]')
                                .equals(['KJV', book, chapter])
                                .and(v => v.verse >= seg.verse && v.verse <= seg.verseEnd!)
                                .sortBy('verse');
                        } else {
                            const v = await db.bibleVerses
                                .where('[versionId+book+chapter+verse]')
                                .equals(['KJV', book, chapter, seg.verse])
                                .first();
                            if (v) segVerses = [v];
                        }
                        if (segVerses.length > 0) activeVer = 'KJV';
                    }

                    // Fallback to case-insensitive book match if needed
                    if (segVerses.length === 0) {
                        const allInChapter = await db.bibleVerses
                            .where('chapter')
                            .equals(chapter)
                            .filter(v => (v.versionId === activeVer || v.versionId === 'KJV') && v.book.toLowerCase() === book.toLowerCase())
                            .sortBy('verse');
                        if (allInChapter.length > 0) {
                            segVerses = allInChapter.filter(v =>
                                seg.verseEnd ? (v.verse >= seg.verse && v.verse <= seg.verseEnd) : v.verse === seg.verse
                            );
                            if (segVerses.length > 0) activeVer = segVerses[0].versionId;
                        }
                    }

                    if (isCancelled) return;

                    // Decrypt verses (Rule 1)
                    const plainVerses = await decryptVerses(segVerses);

                    plainVerses.forEach((pv, pIdx) => {
                        resultVerses.push({
                            verse: pv.verse,
                            text: pv.text,
                            omittedBeforeNotice: pIdx === 0 ? omittedBeforeNotice : null
                        });
                    });
                }

                if (!isCancelled) {
                    setVerses(resultVerses);
                    setActiveVersionBadge(activeVer);
                    setLoading(false);
                }
            } catch (err) {
                console.error('[PulpitScriptureModal] Failed to load verses:', err);
                if (!isCancelled) {
                    setLoading(false);
                }
            }
        };

        fetchPassage();

        return () => {
            isCancelled = true;
        };
    }, [target, selectedVersion]);

    if (!target) return null;

    const refString = target.segments
        ? `${target.book} ${target.chapter}:${target.segments.replace(/,/g, ', ').replace(/-/g, '–')}`
        : target.verseEnd && target.verseEnd > target.verse
            ? `${target.book} ${target.chapter}:${target.verse}–${target.verseEnd}`
            : `${target.book} ${target.chapter}:${target.verse}`;

    const handleCopy = () => {
        const fullText = verses.map(v => `${v.verse} ${v.text}`).join(' ');
        navigator.clipboard.writeText(`"${fullText}" — ${refString} (${activeVersionBadge})`);
        setCopied(true);
        showToast('Scripture copied to clipboard', 'success');
        setTimeout(() => setCopied(false), 2000);
    };

    const isContrast = themeMode === 'contrast';
    const isDark = themeMode === 'dark' || isContrast;

    const cardBg = isContrast
        ? 'bg-black text-amber-300 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.2)]'
        : isDark
            ? 'bg-neutral-900 text-neutral-100 border-neutral-700 shadow-2xl'
            : 'bg-white text-neutral-900 border-neutral-200 shadow-2xl';

    const headerBg = isContrast
        ? 'border-amber-500/30 bg-neutral-950/80'
        : isDark
            ? 'border-neutral-800 bg-neutral-900/90'
            : 'border-neutral-200 bg-neutral-50/90';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
                {/* Backdrop Click */}
                <div className="absolute inset-0" onClick={onClose} />

                {/* Scripture Panel */}
                <motion.div
                    initial={{ opacity: 0, y: isMobile ? 100 : 30, scale: isMobile ? 1 : 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: isMobile ? 100 : 30, scale: isMobile ? 1 : 0.96 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={`relative z-10 w-full sm:max-w-2xl max-h-[82vh] flex flex-col rounded-t-3xl sm:rounded-3xl border overflow-hidden ${cardBg}`}
                >
                    {/* Header */}
                    <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 shrink-0 backdrop-blur-md ${headerBg}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${isContrast ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/10 text-primary'}`}>
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                                    <span>{refString}</span>
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isContrast ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                                        {activeVersionBadge}
                                    </span>
                                </h3>
                                <p className="text-xs opacity-60">Lectern Scripture Quick-Lookup</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Version Selector */}
                            {installedVersions && installedVersions.length > 1 && (
                                <select
                                    value={selectedVersion}
                                    onChange={(e) => setSelectedVersion(e.target.value)}
                                    className={`text-xs font-bold rounded-xl px-2 py-1.5 border outline-none cursor-pointer ${isContrast ? 'bg-black text-amber-400 border-amber-500/40' : isDark ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-neutral-100 text-neutral-800 border-neutral-300'}`}
                                >
                                    {installedVersions.map((v: BibleVersion) => (
                                        <option key={v.id} value={v.id}>
                                            {v.id.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {/* Copy Button */}
                            <button
                                onClick={handleCopy}
                                className={`p-2 rounded-xl transition-all active:scale-95 min-w-[40px] min-h-[40px] flex items-center justify-center border ${isContrast ? 'border-amber-500/30 hover:bg-amber-500/20 text-amber-300' : 'border-current/10 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                title="Copy scripture to clipboard"
                            >
                                {copied ? <Check size={17} className="text-emerald-500" /> : <Copy size={17} />}
                            </button>

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className={`p-2 rounded-xl transition-all active:scale-95 min-w-[40px] min-h-[40px] flex items-center justify-center border ${isContrast ? 'border-amber-500/30 hover:bg-amber-500/20 text-amber-300' : 'border-current/10 hover:bg-black/5 dark:hover:bg-white/5'}`}
                                title="Close (Esc)"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar text-base sm:text-lg font-serif leading-relaxed space-y-4">
                        {loading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-60">
                                <Loader2 size={28} className="animate-spin text-primary" />
                                <span className="text-xs font-sans uppercase tracking-widest">Loading Scripture...</span>
                            </div>
                        ) : verses.length === 0 ? (
                            <div className="py-12 text-center opacity-60 font-sans">
                                <p className="text-sm">Passage text not found in local translations.</p>
                                <p className="text-xs mt-1 opacity-70">Check installed Bible versions in Settings.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {verses.map(v => (
                                    <React.Fragment key={v.verse}>
                                        {v.omittedBeforeNotice && (
                                            <div className="flex items-center gap-3 py-2 my-1 select-none opacity-60">
                                                <div className="h-[1px] flex-1 bg-current opacity-20" />
                                                <span className="text-[11px] font-sans font-bold italic tracking-wider px-3 py-0.5 rounded-full border border-current/20">
                                                    {v.omittedBeforeNotice}
                                                </span>
                                                <div className="h-[1px] flex-1 bg-current opacity-20" />
                                            </div>
                                        )}
                                        <p className="flex gap-2.5 items-baseline">
                                            <sup className={`text-xs font-sans font-bold select-none ${isContrast ? 'text-amber-500' : 'text-primary'}`}>
                                                {v.verse}
                                            </sup>
                                            <span>{v.text}</span>
                                        </p>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Tip */}
                    <div className={`px-5 py-2.5 border-t text-[11px] font-sans flex items-center justify-between opacity-60 select-none ${headerBg}`}>
                        <span>Parchments Lectern Reference</span>
                        <span>Tap outside or press ESC to dismiss</span>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
