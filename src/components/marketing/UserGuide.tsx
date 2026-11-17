import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarketingLayout } from './MarketingLayout';
import { ShowcaseVideoCard } from './ShowcaseVideoCard';
// @ts-ignore
import guideContent from '../../../USER_GUIDE.md?raw';

export const UserGuide: React.FC = () => {
    return (
        <MarketingLayout>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 overflow-x-hidden space-y-12">
                {/* Embedded 30-Second Guided Video Tour */}
                <section aria-label="Guided Product Video Tour" className="space-y-4">
                    <div className="text-center space-y-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[11px] font-black uppercase tracking-widest text-primary">
                            Video Walkthrough
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                            See Parchments in Action Before Reading
                        </h2>
                    </div>
                    <ShowcaseVideoCard />
                </section>

                <div className="prose prose-invert prose-primary max-w-none break-words prose-h1:text-3xl sm:prose-h1:text-5xl md:prose-h1:text-7xl prose-h1:mb-10 prose-headings:tracking-tighter prose-headings:font-black prose-headings:italic prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-4 prose-h2:mt-16 prose-p:text-white/60 prose-p:leading-relaxed prose-li:text-white/60 prose-a:break-all prose-code:break-words prose-pre:overflow-x-auto prose-pre:max-w-full prose-table:block prose-table:overflow-x-auto prose-table:border prose-table:border-white/10 prose-table:rounded-xl prose-th:bg-white/5 prose-th:px-4 prose-th:py-3 prose-td:px-4 prose-td:py-3 prose-td:border-t prose-td:border-white/5 prose-strong:text-white prose-strong:font-bold prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {guideContent}
                    </ReactMarkdown>
                </div>
            </div>
        </MarketingLayout>
    );
};
