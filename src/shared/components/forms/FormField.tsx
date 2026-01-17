/**
 * FormField Component - Form field wrapper with label and error
 */

import React from 'react';
import './FormField.css';

export interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
  className = '',
}) => {
  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label className="form-field-label">
          {label}
          {required && <span className="form-field-required">*</span>}
        </label>
      )}
      {children}
      {error && <span className="form-field-error">{error}</span>}
    </div>
  );
};
