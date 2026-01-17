/**
 * Admin Dashboard Page
 */

import React, { useState, useEffect } from 'react';
import { authStore } from '@/store/authStore';
import { AttendanceDashboard } from '@/features/attendance/components/AttendanceDashboard';
import { employeeService } from '@/services/employee.service';
import { logger } from '@/shared/utils/logger';
import { User } from '@/types';
import './AdminPage.css';

export const AdminPage: React.FC = () => {
  const { user } = authStore();
  const [proxyUsers, setProxyUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProxyUsers();
  }, []);

  const loadProxyUsers = async () => {
    try {
      setLoading(true);
      const users = await employeeService.getAllProxyEnabledUsers();
      setProxyUsers(users);
    } catch (err) {
      logger.error('[AdminPage] Failed to load proxy users', err);
    } finally {
      setLoading(false);
    }
  };

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
            <h3>Proxy Management</h3>
            <p>
              {loading ? 'Loading...' : `${proxyUsers.length} user(s) with proxy permission`}
            </p>
            {proxyUsers.length > 0 && (
              <div className="proxy-users-list">
                {proxyUsers.map((proxyUser) => (
                  <div key={proxyUser.id} className="proxy-user-item">
                    <span>{proxyUser.name}</span>
                    <span className="proxy-user-email">{proxyUser.email}</span>
                  </div>
                ))}
              </div>
            )}
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

