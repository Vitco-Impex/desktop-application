/**
 * Switch Component - Toggle switch
 */

import React from 'react';
import './Switch.css';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const switchId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`switch-group ${className}`}>
      <label htmlFor={switchId} className="switch-wrapper">
        <input
          type="checkbox"
          id={switchId}
          className={`switch ${error ? 'switch--error' : ''}`}
          role="switch"
          {...props}
        />
        <span className="switch-slider" />
      </label>
      {label && (
        <label htmlFor={switchId} className="switch-label">
          {label}
        </label>
      )}
      {error && <span className="switch-error">{error}</span>}
    </div>
  );
};
