/**
 * Attendance Page
 */

import React from 'react';
import { authStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { SelfAttendance } from '@/features/attendance/components/SelfAttendance';
import { AttendanceList } from '@/features/attendance/components/AttendanceList';
import './AttendancePage.css';

export const AttendancePage: React.FC = () => {
  const { user } = authStore();

  if (!user) {
    return null;
  }

  // Only employees can mark their own attendance
  // Admins can view but not mark
  const canMarkAttendance = 
    user.role === UserRole.EMPLOYEE ||
    user.role === UserRole.MANAGER ||
    user.role === UserRole.HR;

  // Determine if attendance list should be shown
  // Employee: No list (only self)
  // Manager: Team members (same department)
  // HR: All employees and managers
  // Admin: All HRs, managers, and employees
  const showAttendanceList = 
    user.role === UserRole.MANAGER ||
    user.role === UserRole.HR ||
    user.role === UserRole.ADMIN;

  return (
    <div className="attendance-page">
      <div className="attendance-page-header">
        <h1>Attendance</h1>
        <p className="page-subtitle">Manage your daily attendance</p>
      </div>

      {/* Self Attendance Section - Always visible */}
      <SelfAttendance canMarkAttendance={canMarkAttendance} />

      {/* Attendance List Section - Role-based visibility */}
      {showAttendanceList && (
        <AttendanceList role={user.role} />
      )}
    </div>
  );
};
