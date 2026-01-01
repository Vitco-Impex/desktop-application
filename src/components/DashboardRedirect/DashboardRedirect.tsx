/**
 * Dashboard Redirect Component
 * Redirects to role-specific dashboard based on user role
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { authStore } from '@/store/authStore';

export const DashboardRedirect: React.FC = () => {
  const { user } = authStore();

  const roleDashboards: Record<string, string> = {
    admin: '/admin',
    hr: '/hr',
    manager: '/manager',
    employee: '/employee',
  };

  const redirectTo = user?.role ? roleDashboards[user.role] : '/dashboard';

  return <Navigate to={redirectTo} replace />;
};

