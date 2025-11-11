import React from 'react';

interface ScreenHeaderProps {
  title: string;
  description?: string;
}

const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, description }) => {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
    </div>
  );
};

export default ScreenHeader;