import React from 'react';

const LogoImage: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <img
      src="https://i.imgur.com/Wwj0ndy.png"
      alt="Watsons Logo"
      className={className}
    />
  );
};

export default LogoImage;