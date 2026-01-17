/**
 * LoadingState Component - Loading state display
 */

import React from 'react';
import { Spinner } from '../ui/Spinner';
import './LoadingState.css';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  className = '',
}) => {
  return (
    <div className={`loading-state ${className}`}>
      <Spinner size={size} />
      {message && <p className="loading-state-message">{message}</p>}
    </div>
  );
};
