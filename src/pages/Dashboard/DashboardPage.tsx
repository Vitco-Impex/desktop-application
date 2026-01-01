/**
 * Dashboard Page
 */

import React from 'react';
import { authStore } from '@/store/authStore';
import './DashboardPage.css';

export const DashboardPage: React.FC = () => {
  const { user } = authStore();

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <p className="dashboard-subtitle">
          {user?.name} • {user?.role}
          {user?.department && ` • ${user.department}`}
        </p>
      </div>

      <div className="dashboard-content">
        <p>Role-specific dashboard content will be displayed here.</p>
      </div>
    </div>
  );
};

