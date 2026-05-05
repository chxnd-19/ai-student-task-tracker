import React from 'react';

const Card = ({ children, className = '', hover = true, ...props }) => {
  return (
    <div
      className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 transition-all duration-200 ${
        hover ? 'hover:border-white/20 hover:shadow-lg' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
