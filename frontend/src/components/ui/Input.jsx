import React from 'react';

const Input = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full h-11 px-4 rounded-lg bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${className}`}
      {...props}
    />
  );
};

export default Input;
