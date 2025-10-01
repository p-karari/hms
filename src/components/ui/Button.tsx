import React from "react";

interface ButtonProps extends React.ComponentProps<'button'> {
    children: React.ReactNode;
    className?: string;
}

export function Button({ children, className, ...props }: ButtonProps) {

    const baseStyles = 'px-4 py-2 font-semibold text-white rounded-md transition-colors duration-200';
    const defaultStyles = 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed';

    return (
        <button
            className={`${baseStyles} ${defaultStyles} ${className || ''}`}
            {...props}
            >
            {children}
        </button>
    );
}