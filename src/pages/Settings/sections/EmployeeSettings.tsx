/**
 * Employee Settings Section
 * Employee management for HR and Admin
 */

import React from 'react';
import { EmployeeManagement } from '@/features/employees/components/EmployeeManagement';
import './EmployeeSettings.css';

export const EmployeeSettings: React.FC = () => {
  return (
    <div className="employee-settings">
      <EmployeeManagement />
    </div>
  );
};

