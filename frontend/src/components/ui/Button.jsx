import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  ...props 
}) => {
  const baseStyles = 'h-11 px-4 rounded-lg font-medium transition-all duration-200';
  
  const variants = {
    primary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 active:scale-[0.98]',
    secondary: 'bg-white/10 border border-white/10 text-white hover:bg-white/20',
    danger: 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30',
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed';

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${disabled ? disabledStyles : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
