/**
 * Radio Component
 */

import React from 'react';
import './Radio.css';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Radio: React.FC<RadioProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`radio-group ${className}`}>
      <input
        type="radio"
        id={radioId}
        className={`radio ${error ? 'radio--error' : ''}`}
        {...props}
      />
      {label && (
        <label htmlFor={radioId} className="radio-label">
          {label}
        </label>
      )}
      {error && <span className="radio-error">{error}</span>}
    </div>
  );
};
