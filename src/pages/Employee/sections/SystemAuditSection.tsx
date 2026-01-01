/**
 * System & Audit Section - Transparency & compliance (read-only)
 */

import React, { useState, useEffect } from 'react';
import { EmployeeDetails } from '@/types';
import { SectionWrapper } from '@/components/EmployeeDetails/SectionWrapper';
import './SystemAuditSection.css';

interface SystemAuditSectionProps {
  employee: EmployeeDetails;
  employeeId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

interface AuditLogEntry {
  field: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  timestamp: string;
  action: string;
}

export const SystemAuditSection: React.FC<SystemAuditSectionProps> = ({
  employee,
  employeeId,
  isExpanded,
  onToggle,
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      // TODO: Load audit logs from API
      // For now, we'll just show the system fields
    }
  }, [isExpanded, employeeId]);

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SectionWrapper
      title="System & Audit Information"
      icon="📊"
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className="system-audit-content">
        <div className="system-audit-grid">
          <div className="form-field">
            <label className="field-label">Account Created At</label>
            <div className="field-value read-only">
              {formatDate(employee.createdAt)}
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Last Updated</label>
            <div className="field-value read-only">
              {formatDate(employee.updatedAt)}
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Last Login</label>
            <div className="field-value read-only">
              {formatDate(employee.lastLogin)}
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Last Attendance Action</label>
            <div className="field-value read-only">
              {formatDate(employee.lastAttendanceAction)}
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Last Task Update</label>
            <div className="field-value read-only">
              {formatDate(employee.lastTaskUpdate)}
            </div>
          </div>
        </div>

        {/* TODO: Add audit log entries table when API is available */}
        {auditLogs.length > 0 && (
          <div className="audit-log-section">
            <h3 className="audit-log-title">Recent Changes</h3>
            <div className="audit-log-table">
              <table>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Old Value</th>
                    <th>New Value</th>
                    <th>Changed By</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log, index) => (
                    <tr key={index}>
                      <td>{log.field}</td>
                      <td>{String(log.oldValue || '—')}</td>
                      <td>{String(log.newValue || '—')}</td>
                      <td>{log.changedBy}</td>
                      <td>{formatDate(log.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
};

