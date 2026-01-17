/**
 * StatusBadge Component - Generic status badge (NOT department-specific)
 */

import React from 'react';
import { Badge, BadgeVariant } from '../ui/Badge';

export interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant | ((status: string) => BadgeVariant);
  className?: string;
}

const defaultVariantMap: Record<string, BadgeVariant> = {
  active: 'success',
  inactive: 'neutral',
  pending: 'warning',
  completed: 'success',
  cancelled: 'error',
  draft: 'neutral',
  confirmed: 'primary',
  processing: 'primary',
  shipped: 'primary',
  delivered: 'success',
  paid: 'success',
  overdue: 'error',
  low_stock: 'warning',
  out_of_stock: 'error',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  className = '',
}) => {
  const getVariant = (): BadgeVariant => {
    if (typeof variant === 'function') {
      return variant(status);
    }
    if (variant) {
      return variant;
    }
    return defaultVariantMap[status.toLowerCase()] || 'neutral';
  };

  return (
    <Badge variant={getVariant()} className={className}>
      {status}
    </Badge>
  );
};
