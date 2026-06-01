import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarketingLayout } from './MarketingLayout';
// @ts-ignore
import termsContent from '../../../TERMS_OF_SERVICE.md?raw';

export const TermsOfService: React.FC = () => {
    return (
        <MarketingLayout>
            <div className="max-w-4xl mx-auto px-6 py-20">
                <div className="prose prose-invert prose-primary max-w-none 
                    prose-headings:tracking-tighter prose-headings:font-black prose-headings:italic
                    prose-h1:text-5xl md:prose-h1:text-7xl prose-h1:mb-12
                    prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-4 prose-h2:mt-20
                    prose-p:text-white/60 prose-p:leading-relaxed
                    prose-li:text-white/60
                    prose-table:border prose-table:border-white/10 prose-table:rounded-xl prose-table:overflow-hidden
                    prose-th:bg-white/5 prose-th:px-4 prose-th:py-3
                    prose-td:px-4 prose-td:py-3 prose-td:border-t prose-td:border-white/5
                    prose-strong:text-white prose-strong:font-bold
                    prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl
                ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {termsContent}
                    </ReactMarkdown>
                </div>
            </div>
        </MarketingLayout>
    );
};
