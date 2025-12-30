import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    isLoading?: boolean;
    children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    icon,
    isLoading = false,
    children,
    className = '',
    disabled,
    ...props
}) => {
    // Shared classes (handled by .btn in index.css for the most part, but we can add utilities here)
    // Actually, let's keep it simple and rely on index.css classes we defined.
    // M2 Design: Spacious buttons.

    const variantClasses = {
        primary: 'btn-primary', // defined in index.css
        secondary: 'btn-secondary', // defined in index.css
        ghost: 'btn-ghost', // defined in index.css
    };

    const sizeClasses = {
        // Updated sizes based on user feedback (Smaller/Refined)
        sm: 'px-3 py-1 text-xs',
        md: 'px-4 py-1.5 text-sm',
        lg: 'px-5 py-2.5 text-base',
    };

    return (
        <motion.button
            whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
            whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
            className={`btn ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <span className="animate-spin mr-2">...</span> // Simple loader for now
            ) : icon}
            {children}
        </motion.button>
    );
};
