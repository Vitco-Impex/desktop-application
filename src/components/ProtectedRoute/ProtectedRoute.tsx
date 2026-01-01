/**
 * Protected Route Component
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authStore } from '@/store/authStore';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  redirectTo?: string;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  redirectTo = '/login',
  children,
}) => {
  const { isAuthenticated, user, hasAnyRole } = authStore();

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    // Redirect to role-specific dashboard or show unauthorized
    const roleRoutes: Record<UserRole, string> = {
      [UserRole.ADMIN]: '/admin',
      [UserRole.HR]: '/hr',
      [UserRole.MANAGER]: '/manager',
      [UserRole.EMPLOYEE]: '/employee',
    };
    return <Navigate to={roleRoutes[user.role] || '/dashboard'} replace />;
  }

  // If children provided, render them; otherwise use Outlet for nested routes
  return children ? <>{children}</> : <Outlet />;
};

