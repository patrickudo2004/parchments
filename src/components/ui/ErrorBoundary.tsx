import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="h-screen w-screen flex items-center justify-center bg-light-background dark:bg-dark-background p-8">
                    <div className="max-w-md w-full bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl p-8 shadow-2xl text-center space-y-6">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="text-red-600 dark:text-red-400" size={32} />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                                Something went wrong
                            </h2>
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                                The application encountered an unexpected error. This might happen if the database is busy or memory is low.
                            </p>
                        </div>

                        <div className="bg-light-background dark:bg-dark-background/50 rounded-lg p-3 text-left overflow-auto max-h-32 border border-light-border dark:border-dark-border">
                            <code className="text-[10px] text-red-500 font-mono break-all">
                                {this.state.error?.message || 'Unknown error'}
                            </code>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
                        >
                            <RefreshCw size={18} />
                            Restart Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
