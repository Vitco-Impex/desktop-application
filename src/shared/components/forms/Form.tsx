/**
 * Form Component - Form wrapper with validation
 */

import React, { FormEvent } from 'react';
import './Form.css';

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export const Form: React.FC<FormProps> = ({
  onSubmit,
  children,
  className = '',
  ...props
}) => {
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await onSubmit(e);
  };

  return (
    <form className={`form ${className}`} onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
};
