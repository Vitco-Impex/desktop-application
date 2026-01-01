/**
 * Textarea Component - Minimal, compact UI primitive
 */

import React from 'react';
import './Textarea.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`textarea-group ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="textarea-label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`textarea ${error ? 'textarea--error' : ''}`}
        {...props}
      />
      {error && <span className="textarea-error">{error}</span>}
    </div>
  );
};

