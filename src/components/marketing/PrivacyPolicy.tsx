import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarketingLayout } from './MarketingLayout';
// @ts-ignore
import privacyContent from '../../../PRIVACY_POLICY.md?raw';

export const PrivacyPolicy: React.FC = () => {
    return (
        <MarketingLayout>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20 overflow-x-hidden">
                <div className="prose prose-invert prose-primary max-w-none break-words prose-h1:text-3xl sm:prose-h1:text-5xl md:prose-h1:text-7xl prose-h1:mb-10 prose-h1:tracking-tighter prose-h1:font-black prose-h1:italic prose-headings:tracking-tighter prose-headings:font-black prose-headings:italic prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-4 prose-h2:mt-16 prose-p:text-white/60 prose-p:leading-relaxed prose-li:text-white/60 prose-a:break-all prose-code:break-words prose-pre:overflow-x-auto prose-table:block prose-table:overflow-x-auto prose-table:border prose-table:border-white/10 prose-table:rounded-xl prose-th:bg-white/5 prose-th:px-4 prose-th:py-3 prose-td:px-4 prose-td:py-3 prose-td:border-t prose-td:border-white/5 prose-strong:text-white prose-strong:font-bold prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-xl">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {privacyContent}
                    </ReactMarkdown>
                </div>
            </div>
        </MarketingLayout>
    );
};
