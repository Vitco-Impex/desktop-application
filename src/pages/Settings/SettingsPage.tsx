/**
 * Settings Page - Minimal, compact design
 * Organized by sections with role-based access
 */

import React, { useState, useEffect } from 'react';
import { authStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { PersonalSettings } from './sections/PersonalSettings';
import { AttendanceSettings } from './sections/AttendanceSettings';
import { ReportsSettings } from './sections/ReportsSettings';
import { EmployeeSettings } from './sections/EmployeeSettings';
import { ShiftSettings } from './sections/ShiftSettings';
import { ProxySettings } from './sections/ProxySettings';
import { SystemLogs } from './sections/SystemLogs';
import { CompanySettings } from './sections/CompanySettings';
import './SettingsPage.css';

type SettingsSection =
  | 'personal'
  | 'attendance'
  | 'reports'
  | 'employees'
  | 'shifts'
  | 'proxy'
  | 'company'
  | 'logs';

export const SettingsPage: React.FC = () => {
  const { user } = authStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('personal');

  useEffect(() => {
    // Listen for open-logs-viewer event from tray menu
    const handleOpenLogsViewer = () => {
      setActiveSection('logs');
    };

    window.addEventListener('open-logs-viewer', handleOpenLogsViewer);

    // Check URL hash for direct navigation
    const hash = window.location.hash.replace('#', '');
    if (hash === 'logs') {
      setActiveSection('logs');
    }

    return () => {
      window.removeEventListener('open-logs-viewer', handleOpenLogsViewer);
    };
  }, []);

  const canManageEmployees = user?.role === UserRole.HR || user?.role === UserRole.ADMIN;

  const sections = [
    { id: 'personal' as const, label: 'Personal', icon: '👤' },
    { id: 'attendance' as const, label: 'Attendance', icon: '📅' },
    { id: 'reports' as const, label: 'Reports', icon: '📊' },
    ...(canManageEmployees ? [{ id: 'employees' as const, label: 'Employees', icon: '👥' }] : []),
    ...(canManageEmployees ? [{ id: 'shifts' as const, label: 'Shifts', icon: '🕐' }] : []),
    ...(user?.role === UserRole.ADMIN
      ? [{ id: 'company' as const, label: 'Company Details', icon: '🏢' }]
      : []),
    { id: 'proxy' as const, label: 'Proxy Server', icon: '🔌' },
    { id: 'logs' as const, label: 'System Logs', icon: '📋' },
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your account settings and preferences</p>
      </div>

      <div className="settings-container">
        <div className="settings-sidebar">
          <nav className="settings-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="settings-nav-icon">{section.icon}</span>
                <span className="settings-nav-label">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="settings-content">
          {activeSection === 'personal' && <PersonalSettings />}
          {activeSection === 'attendance' && <AttendanceSettings />}
          {activeSection === 'reports' && <ReportsSettings />}
          {activeSection === 'employees' && canManageEmployees && <EmployeeSettings />}
          {activeSection === 'shifts' && canManageEmployees && <ShiftSettings />}
          {activeSection === 'proxy' && <ProxySettings />}
          {activeSection === 'company' && user?.role === UserRole.ADMIN && <CompanySettings />}
          {activeSection === 'logs' && <SystemLogs />}
        </div>
      </div>
    </div>
  );
};
