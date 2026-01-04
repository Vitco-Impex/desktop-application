/**
 * Attendance List Component
 * Shows attendance records based on role permissions
 * Toggle status column for HR/Manager/Admin to mark attendance
 */

import React, { useState, useEffect } from 'react';
import { attendanceService } from '@/services/attendance.service';
import { socketService } from '@/services/socket.service';
import { authStore } from '@/store/authStore';
import { AttendanceDashboardData, AttendanceSessionStatus, UserRole } from '@/types';
import { MarkAttendanceDialog } from './MarkAttendanceDialog';
import './AttendanceList.css';

interface AttendanceListProps {
  role: UserRole;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({ role }) => {
  const { user } = authStore();
  const [dashboardData, setDashboardData] = useState<AttendanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{
    id: string;
    name: string;
    status: AttendanceSessionStatus;
  } | null>(null);

  useEffect(() => {
    loadAttendanceList();
    
    // Connect to Socket.IO
    socketService.connect();

    // Subscribe to real-time updates
    socketService.onAttendanceUpdate(() => {
      loadAttendanceList();
    });

    socketService.onDashboardRefresh(() => {
      loadAttendanceList();
    });

    return () => {
      socketService.offAttendanceUpdate();
      socketService.offDashboardRefresh();
    };
  }, [selectedDate, role, user?.department]);

  const loadAttendanceList = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await attendanceService.getDashboard({
        date: selectedDate,
        department: role === UserRole.MANAGER ? user?.department : undefined,
      });
      setDashboardData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: AttendanceSessionStatus): string => {
    switch (status) {
      case AttendanceSessionStatus.CHECKED_IN:
        return 'Checked In';
      case AttendanceSessionStatus.CHECKED_OUT:
        return 'Checked Out';
      default:
        return 'Not Started';
    }
  };

  const getStatusClass = (status: AttendanceSessionStatus): string => {
    switch (status) {
      case AttendanceSessionStatus.CHECKED_IN:
        return 'status-checked-in';
      case AttendanceSessionStatus.CHECKED_OUT:
        return 'status-checked-out';
      default:
        return 'status-not-started';
    }
  };

  // Helper function to validate MongoDB ObjectId format
  const isValidObjectId = (id: any): boolean => {
    if (!id || typeof id !== 'string') return false;
    if (id === 'unknown' || id === 'null') return false;
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // Combine all attendance records
  // Filter out any records with missing or invalid employeeId
  const allRecords = [
    ...(dashboardData?.checkedIn
      .filter((item) => item.employeeId && isValidObjectId(item.employeeId))
      .map((item) => ({ ...item, type: 'checked-in' })) || []),
    ...(dashboardData?.checkedOut
      .filter((item) => item.employeeId && isValidObjectId(item.employeeId))
      .map((item) => ({ ...item, type: 'checked-out' })) || []),
    ...(dashboardData?.notStarted
      .filter((item) => item.employeeId && isValidObjectId(item.employeeId))
      .map((item) => ({ 
        ...item, 
        type: 'not-started',
        status: AttendanceSessionStatus.NOT_STARTED,
        checkInTime: '',
        checkOutTime: '',
        totalDuration: 0,
      })) || []),
  ];

  // Backend already filters based on role, so we use all records
  // Frontend filtering is minimal - just ensure we don't show list for employees
  const filteredRecords = role === UserRole.EMPLOYEE ? [] : allRecords;

  // Check if user can mark attendance for others
  const canMarkForOthers = [UserRole.HR, UserRole.MANAGER, UserRole.ADMIN].includes(role);

  const handleStatusToggle = (record: any) => {
    if (!canMarkForOthers) return;
    
    // Validate employeeId before opening dialog
    const employeeId = record.employeeId;
    if (!isValidObjectId(employeeId)) {
      console.warn('[AttendanceList] Invalid employeeId for record:', record);
      // Show a less alarming error message - this is a data issue, not a critical error
      setError(`Unable to mark attendance for ${record.employeeName || 'this employee'}. Please refresh the page.`);
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    // Clear any previous errors
    setError(null);
    
    setSelectedEmployee({
      id: employeeId,
      name: record.employeeName || 'Unknown',
      status: record.status,
    });
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    loadAttendanceList();
  };

  const getListTitle = (): string => {
    switch (role) {
      case UserRole.MANAGER:
        return 'Team Attendance';
      case UserRole.HR:
        return 'Employee & Manager Attendance';
      case UserRole.ADMIN:
        return 'All Attendance Records';
      default:
        return 'Attendance Records';
    }
  };

  if (loading) {
    return (
      <div className="attendance-list">
        <div className="attendance-list-loading">Loading attendance data...</div>
      </div>
    );
  }

  return (
    <div className="attendance-list">
      <div className="attendance-list-header">
        <h2 className="attendance-list-title">{getListTitle()}</h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="attendance-list-date-filter"
        />
      </div>

      {error && (
        <div className="attendance-list-error-banner" role="alert">
          {error}
          <button
            className="attendance-list-error-close"
            onClick={() => setError(null)}
            aria-label="Close error message"
          >
            ×
          </button>
        </div>
      )}

      {filteredRecords.length === 0 ? (
        <div className="attendance-list-empty">
          No attendance records found for the selected date.
        </div>
      ) : (
        <div className="attendance-list-table-container">
          <table className="attendance-list-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status{canMarkForOthers ? ' (Click to Toggle)' : ''}</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords
                .filter((record) => record.employeeId) // Additional safety check
                .map((record) => (
                  <tr key={`${record.employeeId}-${record.type}`}>
                    <td className="name-cell">{record.employeeName || 'Unknown'}</td>
                    <td className="role-cell">
                      {'role' in record && record.role
                        ? record.role.charAt(0).toUpperCase() + record.role.slice(1)
                        : '--'}
                    </td>
                    <td className="department-cell">{record.department || '--'}</td>
                    <td>
                      {canMarkForOthers ? (
                        <button
                          className={`status-toggle ${getStatusClass(record.status)}`}
                          onClick={() => handleStatusToggle(record)}
                          title="Click to mark attendance"
                        >
                          {getStatusBadge(record.status)}
                        </button>
                      ) : (
                        <span className={`status-badge ${getStatusClass(record.status)}`}>
                          {getStatusBadge(record.status)}
                        </span>
                      )}
                    </td>
                    <td className="time-cell">
                      {'checkInTime' in record && record.checkInTime
                        ? formatTime(record.checkInTime)
                        : '--'}
                    </td>
                    <td className="time-cell">
                      {'checkOutTime' in record && record.checkOutTime
                        ? formatTime(record.checkOutTime)
                        : '--'}
                    </td>
                    <td className="duration-cell">
                      {'totalDuration' in record && record.totalDuration
                        ? formatDuration(record.totalDuration)
                        : '--'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {dashboardData && (
        <div className="attendance-list-summary">
          <span>Total: {filteredRecords.length}</span>
          <span>Checked In: {dashboardData.summary.checkedInCount}</span>
          <span>Checked Out: {dashboardData.summary.checkedOutCount}</span>
          <span>Not Started: {dashboardData.summary.notStartedCount}</span>
        </div>
      )}

      {selectedEmployee && (
        <MarkAttendanceDialog
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedEmployee(null);
          }}
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
          currentStatus={selectedEmployee.status}
          onSuccess={handleDialogSuccess}
        />
      )}
    </div>
  );
};

