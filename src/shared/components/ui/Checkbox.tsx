/**
 * Checkbox Component
 */

import React from 'react';
import './Checkbox.css';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`checkbox-group ${className}`}>
      <input
        type="checkbox"
        id={checkboxId}
        className={`checkbox ${error ? 'checkbox--error' : ''}`}
        {...props}
      />
      {label && (
        <label htmlFor={checkboxId} className="checkbox-label">
          {label}
        </label>
      )}
      {error && <span className="checkbox-error">{error}</span>}
    </div>
  );
};
