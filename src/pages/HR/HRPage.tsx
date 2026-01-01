/**
 * HR Dashboard Page
 */

import React from 'react';
import { authStore } from '@/store/authStore';
import { AttendanceDashboard } from '@/features/attendance/components/AttendanceDashboard';
import './HRPage.css';

export const HRPage: React.FC = () => {
  const { user } = authStore();

  return (
    <div className="hr-page">
      <div className="page-header">
        <h2>HR Dashboard</h2>
        <p>{user?.name}</p>
      </div>

      <div className="hr-content">
        <div className="attendance-section">
          <AttendanceDashboard role="hr" />
        </div>

        <div className="hr-cards">
          <div className="hr-card">
            <h3>Employee Management</h3>
            <p>Manage employee records, profiles, and information.</p>
          </div>
          <div className="hr-card">
            <h3>Recruitment</h3>
            <p>Handle job postings, applications, and interviews.</p>
          </div>
          <div className="hr-card">
            <h3>Payroll</h3>
            <p>Process payroll and manage compensation.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

