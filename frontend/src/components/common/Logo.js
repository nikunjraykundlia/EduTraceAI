import React from 'react';

const Logo = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  };

  const fontSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-1 font-bold tracking-tight ${fontSize} ${className} cursor-pointer transition-transform hover:scale-105 active:scale-95`} style={{ fontFamily: 'var(--font-display)' }}>
      <span className="bg-clip-text text-transparent bg-gradient-to-br from-[#00A3FF] via-[#00D1FF] to-[#00E5FF] drop-shadow-sm">
        Build-it ON 
      </span>
      <span className="bg-clip-text text-transparent bg-gradient-to-br from-[#00FF88] via-[#12E193] to-[#22FF00] drop-shadow-sm">
         
      </span>
    </div>
  );
};

export default Logo;
