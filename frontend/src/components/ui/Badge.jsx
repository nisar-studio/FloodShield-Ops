import React from 'react';

export function Badge({ variant = 'neutral', children, className = '' }) {
  const variantClass = `ops-badge-${variant}`;
  return (
    <span className={`ops-badge ${variantClass} ${className}`}>
      {children}
    </span>
  );
}
