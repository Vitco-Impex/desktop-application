/**
 * Shift Settings Section
 * Shift management for HR and Admin
 */

import React from 'react';
import { ShiftManagement } from '@/features/shifts/components/ShiftManagement';
import './ShiftSettings.css';

export const ShiftSettings: React.FC = () => {
  return (
    <div className="shift-settings">
      <ShiftManagement />
    </div>
  );
};

