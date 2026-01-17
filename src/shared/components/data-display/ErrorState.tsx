/**
 * ErrorState Component - Error state display
 */

import React from 'react';
import { Button } from '../ui/Button';
import './ErrorState.css';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  className = '',
}) => {
  return (
    <div className={`error-state ${className}`}>
      <div className="error-state-icon">⚠️</div>
      <h3 className="error-state-title">{title}</h3>
      {message && <p className="error-state-message">{message}</p>}
      {onRetry && (
        <div className="error-state-action">
          <Button onClick={onRetry} variant="primary">
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
