/**
 * Admin Dashboard Page
 */

import React from 'react';
import { authStore } from '@/store/authStore';
import { AttendanceDashboard } from '@/features/attendance/components/AttendanceDashboard';
import './AdminPage.css';

export const AdminPage: React.FC = () => {
  const { user } = authStore();

  return (
    <div className="admin-page">
      <div className="page-header">
        <h2>Admin Dashboard</h2>
        <p>{user?.name}</p>
      </div>

      <div className="admin-content">
        <div className="attendance-section">
          <AttendanceDashboard role="admin" />
        </div>

        <div className="admin-cards">
          <div className="admin-card">
            <h3>System Management</h3>
            <p>Manage users, roles, and system settings.</p>
          </div>
          <div className="admin-card">
            <h3>Reports & Analytics</h3>
            <p>View system-wide reports and analytics.</p>
          </div>
          <div className="admin-card">
            <h3>Settings</h3>
            <p>Configure application settings and preferences.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

