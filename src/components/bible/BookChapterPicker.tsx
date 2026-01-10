import React, { useState } from 'react';
import { BIBLE_BOOKS } from '@/lib/bible/BibleData';
import { motion, AnimatePresence } from 'framer-motion';
import CloseIcon from '@mui/icons-material/Close';

interface BookChapterPickerProps {
    currentBook: string;
    currentChapter: number;
    onSelect: (book: string, chapter: number) => void;
    onClose: () => void;
}

export const BookChapterPicker: React.FC<BookChapterPickerProps> = ({
    currentBook,
    currentChapter,
    onSelect,
    onClose
}) => {
    const [selectedBook, setSelectedBook] = useState(currentBook);
    const [view, setView] = useState<'books' | 'chapters'>('books');

    const bookData = BIBLE_BOOKS.find(b => b.name === selectedBook) || BIBLE_BOOKS[0];

    const handleBookSelect = (book: string) => {
        setSelectedBook(book);
        setView('chapters');
    };

    const handleChapterSelect = (chapter: number) => {
        onSelect(selectedBook, chapter);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-14 left-4 z-[110] w-64 max-h-96 bg-white dark:bg-dark-surface shadow-2xl rounded-xl border border-light-border dark:border-dark-border flex flex-col overflow-hidden"
        >
            <div className="p-3 border-b border-light-border dark:border-dark-border flex items-center justify-between shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-light-text-secondary">
                    {view === 'books' ? 'Select Book' : `Select Chapter: ${selectedBook}`}
                </span>
                <button onClick={onClose} className="p-1 hover:bg-light-sidebar dark:hover:bg-dark-sidebar rounded-full transition-colors">
                    <CloseIcon sx={{ fontSize: 14 }} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {view === 'books' ? (
                    <div className="grid grid-cols-1 gap-1">
                        {BIBLE_BOOKS.map(book => (
                            <button
                                key={book.name}
                                onClick={() => handleBookSelect(book.name)}
                                className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${book.name === selectedBook
                                    ? 'bg-primary text-white'
                                    : 'hover:bg-light-sidebar dark:hover:bg-dark-sidebar text-light-text-main dark:text-dark-text-main font-medium'
                                    }`}
                            >
                                {book.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-5 gap-1">
                        <button
                            onClick={() => setView('books')}
                            className="col-span-1 p-2 rounded-md hover:bg-light-sidebar dark:hover:bg-dark-sidebar text-primary flex items-center justify-center"
                        >
                            ←
                        </button>
                        {Array.from({ length: bookData.chapters }, (_, i) => i + 1).map(ch => (
                            <button
                                key={ch}
                                onClick={() => handleChapterSelect(ch)}
                                className={`p-2 rounded-md text-xs font-black transition-colors ${ch === currentChapter && selectedBook === currentBook
                                    ? 'bg-primary text-white'
                                    : 'hover:bg-light-sidebar dark:hover:bg-dark-sidebar text-light-text-main dark:text-dark-text-main'
                                    }`}
                            >
                                {ch}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
};
