import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, startAdornment, endAdornment, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-bold mb-2 text-light-text-primary dark:text-dark-text-primary">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {startAdornment && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary select-none">
                            {startAdornment}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`input ${startAdornment ? 'pl-10' : ''} ${endAdornment ? 'pr-10' : ''} ${error ? 'border-warning' : ''} ${className}`}
                        {...props}
                    />
                    {endAdornment && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary flex items-center">
                            {endAdornment}
                        </div>
                    )}
                </div>
                {error && <p className="mt-1 text-sm text-warning font-medium">{error}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';
