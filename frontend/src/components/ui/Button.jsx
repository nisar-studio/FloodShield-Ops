import React from 'react';

export function Button({
  children,
  variant = 'outline',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  icon: Icon = null,
  className = '',
  type = 'button',
  title = '',
}) {
  const variantClass = `ops-btn-${variant}`;
  return (
    <button
      type={type}
      className={`ops-btn ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
    >
      {loading ? (
        <svg
          className="animate-spin"
          style={{ width: '14px', height: '14px' }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      ) : Icon ? (
        <Icon size={14} />
      ) : null}
      {children}
    </button>
  );
}
