import React from 'react';

const LogoImage: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <img
      src="assets/logo.png"
      alt="logo.png"
      className={className}
    />
  );
};

export default LogoImage;
