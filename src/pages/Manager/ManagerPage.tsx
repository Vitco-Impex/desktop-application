/**
 * Manager Dashboard Page
 */

import React from 'react';
import { authStore } from '@/store/authStore';
import { AttendanceDashboard } from '@/features/attendance/components/AttendanceDashboard';
import './ManagerPage.css';

export const ManagerPage: React.FC = () => {
  const { user } = authStore();

  return (
    <div className="manager-page">
      <div className="page-header">
        <h2>Manager Dashboard</h2>
        <p>{user?.name}</p>
      </div>

      <div className="manager-content">
        <div className="attendance-section">
          <AttendanceDashboard role="manager" />
        </div>

        <div className="manager-cards">
          <div className="manager-card">
            <h3>Team Management</h3>
            <p>View and manage your team members.</p>
          </div>
          <div className="manager-card">
            <h3>Performance Reviews</h3>
            <p>Conduct and review team performance.</p>
          </div>
          <div className="manager-card">
            <h3>Reports</h3>
            <p>View team reports and analytics.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

