import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, icon, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium mb-1.5 text-light-text-primary dark:text-dark-text-primary">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-light-text-secondary dark:text-dark-text-secondary">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`input ${icon ? 'pl-10' : ''} ${error ? 'border-warning' : ''} ${className}`}
                        {...props}
                    />
                </div>
                {error ? (
                    <p className="mt-1 text-sm text-warning">{error}</p>
                ) : helperText ? (
                    <p className="mt-1 text-xs text-light-text-disabled dark:text-dark-text-disabled">{helperText}</p>
                ) : null}
            </div>
        );
    }
);

Input.displayName = 'Input';
