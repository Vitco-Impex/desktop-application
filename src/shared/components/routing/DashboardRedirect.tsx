/**
 * Dashboard Redirect Component - Redirects to role-specific dashboard
 */

import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { authStore } from '@/store/authStore';

export const DashboardRedirect: React.FC = () => {
  const { user } = authStore();

  useEffect(() => {
    // This component will redirect, so no need for side effects
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleDashboards: Record<string, string> = {
    admin: '/admin',
    hr: '/hr',
    manager: '/manager',
    employee: '/employee',
  };

  const targetRoute = roleDashboards[user.role] || '/dashboard';
  return <Navigate to={targetRoute} replace />;
};

