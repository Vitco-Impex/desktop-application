/**
 * FilterBar Component - Generic filter bar (NO department-specific versions)
 */

import React from 'react';
import './FilterBar.css';

export interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`filter-bar ${className}`}>
      {children}
    </div>
  );
};
