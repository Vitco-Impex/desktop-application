/**
 * Skeleton Component - Loading skeleton
 */

import React from 'react';
import './Skeleton.css';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  variant = 'rectangular',
  className = '',
}) => {
  const style: React.CSSProperties = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  const classes = [
    'skeleton',
    `skeleton--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} style={style} aria-hidden="true" />;
};
