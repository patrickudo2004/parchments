import React from 'react';
import { Github, Mail } from 'lucide-react';
import { APP_VERSION } from '@/lib/version';

interface MarketingLayoutProps {
    children: React.ReactNode;
}

export const MarketingLayout: React.FC<MarketingLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 selection:text-white font-sans">
            {/* Skip to Main Content for Screen Readers & Keyboard Navigation (WCAG 2.1 AA) */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2.5 focus:bg-primary focus:text-[#121212] focus:font-black focus:text-xs focus:rounded-xl focus:shadow-2xl focus:ring-2 focus:ring-white focus:outline-none"
            >
                Skip to main content
            </a>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
                <nav aria-label="Main Navigation" className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" aria-label="Parchments Home">
                        <img src="/logo.png" alt="Parchments Logo" className="w-10 h-10 object-contain" />
                        <span className="text-xl font-black tracking-tighter uppercase italic">Parchments</span>
                    </a>

                    <div className="hidden md:flex items-center gap-6 lg:gap-8">
                        <a href="#scenarios" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Scenarios</a>
                        <a href="#comparison" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Comparison</a>
                        <a href="/guide" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Guide</a>
                        <a href="/releases" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Releases</a>
                        <a href="#download" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Download</a>
                        <a
                            href="https://github.com/patrickudo2004/parchments"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                            aria-label="View Parchments source code on GitHub"
                            title="GitHub Repository"
                        >
                            <Github size={18} />
                        </a>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                            href="/app"
                            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-full transition-all border border-white/10 flex items-center gap-1.5 shadow-sm active:scale-95"
                            title="Launch interactive web app without installing"
                        >
                            <span>Try Web App</span>
                        </a>
                        <a
                            href="#download"
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-[#121212] text-xs font-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            Get Beta
                        </a>
                    </div>
                </nav>
            </header>

            {/* Main Content Landmark */}
            <main id="main-content" tabIndex={-1} className="relative pt-20 focus:outline-none">
                {/* Background Decor */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[50%] bg-indigo-600/10 blur-[100px] rounded-full" />
                </div>

                {children}
            </main>

            {/* Footer Landmark */}
            <footer className="bg-[#080808] border-t border-white/5 pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-2 space-y-6">
                            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" aria-label="Parchments Home">
                                <img src="/logo.png" alt="Parchments Logo" className="w-8 h-8 object-contain" />
                                <span className="text-lg font-black tracking-tighter uppercase italic">Parchments</span>
                            </a>
                            <p className="text-white/40 text-sm max-w-sm leading-relaxed">
                                A premium, offline-first Bible study, sermon composition, and exegesis studio. Built for theologians, pastors, and scriptural researchers with complete data sovereignty.
                            </p>
                            <div className="flex items-center gap-4">
                                <a
                                    href="mailto:patrickudo2004@gmail.com"
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                                    aria-label="Email Lead Developer Patrick Udoh"
                                    title="Contact via Email"
                                >
                                    <Mail size={18} />
                                </a>
                                <a
                                    href="https://github.com/patrickudo2004/parchments"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
                                    aria-label="View Parchments project on GitHub"
                                    title="GitHub Repository"
                                >
                                    <Github size={18} />
                                </a>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-6">Product</h4>
                            <ul className="space-y-4 text-sm text-white/40">
                                <li><a href="#scenarios" className="hover:text-white transition-colors">Study Scenarios</a></li>
                                <li><a href="/guide" className="hover:text-white transition-colors">User Guide</a></li>
                                <li><a href="/accessibility" className="hover:text-white transition-colors">Accessibility Statement</a></li>
                                <li><a href="/app" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors italic">Web Preview (/app)</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-6">Downloads</h4>
                            <ul className="space-y-4 text-sm text-white/40">
                                <li>
                                    <a href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_x64_en-US.msi`} className="hover:text-white transition-colors flex items-center gap-2">
                                        Windows (.msi)
                                    </a>
                                </li>
                                <li>
                                    <a href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_universal.dmg`} className="hover:text-white transition-colors flex items-center gap-2">
                                        macOS (.dmg)
                                    </a>
                                </li>
                                <li>
                                    <a href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_amd64.deb`} className="hover:text-white transition-colors flex items-center gap-2 text-xs">
                                        Linux (.deb)
                                    </a>
                                </li>
                                <li>
                                    <a href={`https://github.com/patrickudo2004/parchments/releases/download/v${APP_VERSION}/Parchments_${APP_VERSION}_amd64.AppImage`} className="hover:text-white transition-colors flex items-center gap-2 text-xs">
                                        Linux (.AppImage)
                                    </a>
                                </li>
                                <li>
                                    <a href="https://github.com/patrickudo2004/parchments/releases/latest/download/parchments-android.apk" className="hover:text-white transition-colors flex items-center gap-2 text-xs">
                                        Android (.apk)
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-6">Support & Legal</h4>
                            <ul className="space-y-4 text-sm text-white/40">
                                <li><a href="https://github.com/patrickudo2004/parchments/issues" className="hover:text-white transition-colors text-xs">Report an Issue</a></li>
                                <li><a href="/releases" className="hover:text-white transition-colors text-xs">Release Notes</a></li>
                                <li><a href="/accessibility" className="hover:text-white transition-colors text-xs">Accessibility (WCAG 2.1 AA)</a></li>
                                <li><a href="/privacy" className="hover:text-white transition-colors text-xs">Privacy Policy (UK/EU GDPR)</a></li>
                                <li><a href="/terms" className="hover:text-white transition-colors text-xs">Terms of Service (GPL v3)</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">
                                &copy; 2026 Parchments Project • Free & Open Source (GPL v3)
                            </p>
                            <span className="hidden md:inline text-white/10" aria-hidden="true">•</span>
                            <div className="flex items-center gap-4">
                                <a href="/privacy" className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors font-bold">Privacy Policy</a>
                                <a href="/terms" className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors font-bold">Terms of Use</a>
                                <a href="/accessibility" className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors font-bold">Accessibility</a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
