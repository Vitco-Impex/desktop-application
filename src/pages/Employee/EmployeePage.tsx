/**
 * Employee Dashboard Page
 */

import React from 'react';
import { authStore } from '@/store/authStore';
import { EmployeeAttendance } from '@/features/attendance/components/EmployeeAttendance';
import './EmployeePage.css';

export const EmployeePage: React.FC = () => {
  const { user } = authStore();

  return (
    <div className="employee-page">
      <div className="page-header">
        <h2>Employee Dashboard</h2>
        <p>{user?.name}</p>
      </div>

      <div className="employee-content">
        <div className="attendance-section">
          <EmployeeAttendance />
        </div>
        
        <div className="employee-cards">
          <div className="employee-card">
            <h3>My Profile</h3>
            <p>View and update your personal information.</p>
          </div>
          <div className="employee-card">
            <h3>Leave Requests</h3>
            <p>Submit and track your leave requests.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

