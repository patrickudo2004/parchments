import React from 'react';
import { Github, Mail, Globe } from 'lucide-react';

interface MarketingLayoutProps {
    children: React.ReactNode;
}

export const MarketingLayout: React.FC<MarketingLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 selection:text-white font-sans">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
                <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <img src="/logo.png" alt="Parchments Logo" className="w-10 h-10 object-contain" />
                        <div>
                            <span className="text-xl font-black tracking-tighter uppercase italic">Parchments</span>
                            <span className="block text-[10px] uppercase tracking-[0.2em] font-bold text-primary opacity-80 -mt-1">Beta v0.1.0</span>
                        </div>
                    </a>

                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Features</a>
                        <a href="/guide" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Guide</a>
                        <a href="#download" className="text-sm font-medium text-white/60 hover:text-white transition-colors">Download</a>
                        <a href="https://github.com/patrickudo2004/parchments" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                            <Github size={20} />
                        </a>
                    </div>

                    <div className="flex items-center gap-4">
                        <a
                            href="#download"
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            Get Beta
                        </a>
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <main className="relative pt-20">
                {/* Background Decor */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[50%] bg-indigo-600/10 blur-[100px] rounded-full" />
                </div>

                {children}
            </main>

            {/* Footer */}
            <footer className="bg-[#080808] border-t border-white/5 pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-2 space-y-6">
                            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                <img src="/logo.png" alt="Parchments Logo" className="w-8 h-8 object-contain" />
                                <span className="text-lg font-black tracking-tighter uppercase italic">Parchments</span>
                            </a>
                            <p className="text-white/40 text-sm max-w-sm leading-relaxed">
                                A premium, offline-first Bible study and sermon composition workspace. Built for theologians, pastors, and scriptural researchers.
                            </p>
                            <div className="flex items-center gap-4">
                                <a href="mailto:patrickudo2004@gmail.com" className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
                                    <Mail size={18} />
                                </a>
                                <a href="https://github.com/patrickudo2004/parchments" className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
                                    <Github size={18} />
                                </a>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-6">Product</h4>
                            <ul className="space-y-4 text-sm text-white/40">
                                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="/guide" className="hover:text-white transition-colors">Guide</a></li>
                                <li><a href="/app" className="hover:text-white transition-colors italic">Web Preview</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-6">Downloads</h4>
                            <ul className="space-y-4 text-sm text-white/40">
                                <li>
                                    <a href="https://github.com/patrickudo2004/parchments/releases/latest/download/Parchments_0.1.0_x64_en-US.msi" className="hover:text-white transition-colors flex items-center gap-2">
                                        Windows (.msi)
                                    </a>
                                </li>
                                <li>
                                    <a href="https://github.com/patrickudo2004/parchments/releases/latest/download/Parchments_0.1.0_universal.dmg" className="hover:text-white transition-colors flex items-center gap-2">
                                        macOS (.dmg)
                                    </a>
                                </li>
                                <li>
                                    <a href="https://github.com/patrickudo2004/parchments/releases/latest/download/parchments_0.1.0_amd64.deb" className="hover:text-white transition-colors flex items-center gap-2 text-xs">
                                        Linux (.deb)
                                    </a>
                                </li>
                                <li>
                                    <a href="https://github.com/patrickudo2004/parchments/releases/latest/download/parchments_0.1.0_amd64.AppImage" className="hover:text-white transition-colors flex items-center gap-2 text-xs">
                                        Linux (.AppImage)
                                    </a>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-6">Support</h4>
                            <ul className="space-y-4 text-sm text-white/40">
                                <li><a href="https://github.com/patrickudo2004/parchments/issues" className="hover:text-white transition-colors text-xs">Report an Issue</a></li>
                                <li><a href="https://github.com/patrickudo2004/parchments/releases" className="hover:text-white transition-colors text-xs">Release Notes</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">
                                &copy; 2026 Parchments Project • Free & Open Source
                            </p>
                            <span className="hidden md:inline text-white/10">•</span>
                            <div className="flex items-center gap-4">
                                <a href="/privacy" className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors font-bold">Privacy Policy</a>
                                <a href="/terms" className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors font-bold">Terms of Use</a>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/20 font-bold">
                            <Globe size={12} />
                            <span>Locally Crafted in Africa</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
