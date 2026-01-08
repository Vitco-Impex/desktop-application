/**
 * Employee Management Component - With sidebar navigation
 * For HR and Admin to manage employees (create, edit, delete)
 */

import React, { useState, useEffect } from 'react';
import { employeeService, CreateEmployeeRequest, UpdateEmployeeRequest, ActiveSessionInfo } from '@/services/employee.service';
import { employeeDetailsService } from '@/services/employee.service';
import { shiftService } from '@/services/shift.service';
import { User, UserRole, EmployeeDetails, UpdateEmployeeDetailsRequest } from '@/types';
import { Shift } from '@/types/shift';
import { Button, Input, Card } from '@/shared/components/ui';
import { ProfileSummarySection } from '@/pages/Employee/sections/ProfileSummarySection';
import { EmploymentRoleSection } from '@/pages/Employee/sections/EmploymentRoleSection';
import { ShiftAttendanceSection } from '@/pages/Employee/sections/ShiftAttendanceSection';
import { TaskPreferencesSection } from '@/pages/Employee/sections/TaskPreferencesSection';
import { PermissionsSection } from '@/pages/Employee/sections/PermissionsSection';
import { SystemAuditSection } from '@/pages/Employee/sections/SystemAuditSection';
import { ConfirmationModal } from '@/components/EmployeeDetails/ConfirmationModal';
import { authStore } from '@/store/authStore';
import './EmployeeManagement.css';

type ViewMode = 'list' | 'details' | 'add';

export const EmployeeManagement: React.FC = () => {
  const { user: currentUser } = authStore();
  const [employees, setEmployees] = useState<User[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    request: UpdateEmployeeDetailsRequest;
    confirmRequired: boolean;
  } | null>(null);
  const [sectionsExpanded, setSectionsExpanded] = useState<Record<string, boolean>>({
    profile: true,
    employment: true,
    shift: true,
    task: false,
    permissions: false,
    audit: false,
  });

  const [formData, setFormData] = useState<CreateEmployeeRequest>({
    email: '',
    name: '',
    password: '',
    role: UserRole.EMPLOYEE,
    department: '',
    branchId: '',
    phoneNumber: '',
    employeeId: '',
    designation: '',
  });
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadActiveSessions();
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoadingBranches(true);
      const data = await branchService.getBranches({ isActive: true });
      setBranches(data);
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'add') {
      loadShifts();
    }
  }, [viewMode]);

  useEffect(() => {
    if (selectedEmployeeId && viewMode === 'details') {
      loadEmployeeDetails();
    }
  }, [selectedEmployeeId, viewMode]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedChanges]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getAllEmployees();
      setEmployees(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSessions = async () => {
    try {
      const sessions = await employeeService.getActiveSessions();
      setActiveSessions(sessions);
    } catch (err) {
      console.error('[EmployeeManagement] Failed to load active sessions:', err);
    }
  };

  const loadEmployeeDetails = async () => {
    if (!selectedEmployeeId) return;
    
    setLoadingDetails(true);
    setDetailsError(null);
    
    try {
      const data = await employeeDetailsService.getEmployeeDetails(selectedEmployeeId);
      setEmployeeDetails(data);
      setUnsavedChanges(false);
    } catch (err: any) {
      setDetailsError(err.response?.data?.message || 'Failed to load employee details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadShifts = async () => {
    try {
      setLoadingShifts(true);
      const shiftsData = await shiftService.getActiveShifts();
      setShifts(shiftsData || []);
    } catch (err: any) {
      console.error('Failed to load shifts:', err);
    } finally {
      setLoadingShifts(false);
    }
  };

  const handleAddEmployee = () => {
    setViewMode('add');
    setSelectedEmployeeId(null);
    setEmployeeDetails(null);
    setFormData({
      email: '',
      name: '',
      password: '',
      role: UserRole.EMPLOYEE,
      department: '',
      branchId: '',
      phoneNumber: '',
      employeeId: '',
      designation: '',
    });
    setSelectedShiftId('');
    setError(null);
    setSuccess(null);
  };

  const handleEditEmployee = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setViewMode('details');
    setError(null);
    setSuccess(null);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedEmployeeId(null);
    setEmployeeDetails(null);
    setUnsavedChanges(false);
    setShowConfirmModal(false);
    setPendingUpdate(null);
  };

  const handleCancelForm = () => {
    handleBackToList();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.email || !formData.name) {
      setError('Email and name are required');
      return;
    }

    if (!formData.password) {
      setError('Password is required for new employees');
      return;
    }

    try {
      setLoading(true);
      // Create employee first
      const newEmployee = await employeeService.createEmployee(formData as CreateEmployeeRequest);
      setSuccess('Employee created successfully');
      
      // If shift is selected, assign it to the employee
      if (selectedShiftId) {
        try {
          await shiftService.createAssignment({
            assignmentMode: 'individual',
            employeeId: newEmployee.id,
            shiftId: selectedShiftId,
            assignmentType: 'permanent',
            startDate: new Date().toISOString().split('T')[0],
          });
          setSuccess('Employee created and shift assigned successfully');
        } catch (shiftErr: any) {
          // Employee created but shift assignment failed - show warning
          console.error('Failed to assign shift:', shiftErr);
          setSuccess('Employee created successfully, but shift assignment failed. You can assign a shift later.');
        }
      }
      
      await loadEmployees();
      handleBackToList();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (employee: User) => {
    if (!window.confirm(`Are you sure you want to delete ${employee.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await employeeService.deleteEmployee(employee.id);
      
      setSuccess('Employee deleted successfully');
      await loadEmployees();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('[EmployeeManagement] Delete error:', err);
      
      // Extract error message from various possible locations
      const errorMessage = 
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to delete employee';
      
      setError(errorMessage);
      console.error('[EmployeeManagement] Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutEmployee = async (employee: User) => {
    if (!window.confirm(`Logout ${employee.name} from all active sessions?`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await employeeService.logoutEmployee(employee.id);
      setSuccess('Employee logged out successfully');

      await loadActiveSessions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('[EmployeeManagement] Logout employee error:', err);
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to logout employee';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isEmployeeOnline = (employeeId: string): boolean => {
    return activeSessions.some((session) => session.userId === employeeId);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSectionToggle = (sectionId: string) => {
    setSectionsExpanded((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const requiresConfirmation = (request: UpdateEmployeeDetailsRequest): boolean => {
    return !!(
      request.role ||
      request.assignedShiftId ||
      request.shiftAssignmentType ||
      request.attendanceOverridePermission !== undefined ||
      request.taskStatusOverridePermission !== undefined ||
      request.overtimeEligibilityOverride !== undefined ||
      request.breakRuleOverride !== undefined ||
      request.holidayWorkingPermission !== undefined ||
      request.canActAsProxy !== undefined
    );
  };

  const handleUpdate = async (request: UpdateEmployeeDetailsRequest) => {
    if (!selectedEmployeeId || !employeeDetails) return;

    const confirmRequired = requiresConfirmation(request);

    if (confirmRequired) {
      setPendingUpdate({ request, confirmRequired: true });
      setShowConfirmModal(true);
      return;
    }

    await performUpdate(request);
  };

  const performUpdate = async (request: UpdateEmployeeDetailsRequest) => {
    if (!selectedEmployeeId || !employeeDetails) return;

    try {
      setDetailsError(null);
      const updated = await employeeDetailsService.updateEmployeeDetails(selectedEmployeeId, request);
      setEmployeeDetails(updated);
      setUnsavedChanges(false);
      setShowConfirmModal(false);
      setPendingUpdate(null);
      await loadEmployees(); // Refresh the list
    } catch (err: any) {
      setDetailsError(err.response?.data?.message || 'Failed to update employee details');
      setShowConfirmModal(false);
      setPendingUpdate(null);
    }
  };

  const handleConfirmUpdate = async (reason?: string) => {
    if (pendingUpdate) {
      const updateRequest = reason
        ? { ...pendingUpdate.request, reason }
        : pendingUpdate.request;
      await performUpdate(updateRequest);
    }
  };

  const handleCancelUpdate = () => {
    setShowConfirmModal(false);
    setPendingUpdate(null);
  };

  const canEdit = currentUser?.role === UserRole.HR || currentUser?.role === UserRole.ADMIN;
  const canEditLimited = currentUser?.role === UserRole.MANAGER;

  if (loading && employees.length === 0) {
    return <div className="employee-management-loading">Loading employees...</div>;
  }

  return (
    <div className="employee-management-page">
      <div className="employee-management-header">
        <div>
          <h1 className="employee-management-title">Employee Management</h1>
          <p className="employee-management-subtitle">
            Create, edit, and manage employees. View who is currently online and logout users if needed.
          </p>
        </div>
        <div className="employee-management-header-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              setLoading(true);
              try {
                await Promise.all([loadEmployees(), loadActiveSessions()]);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="employee-management-container">
        <div className="employee-management-sidebar">
          <nav className="employee-management-nav">
            <button
              className={`employee-nav-item ${viewMode === 'list' ? 'active' : ''}`}
              onClick={handleBackToList}
            >
              <span className="employee-nav-icon">📋</span>
              <span className="employee-nav-label">Employee List</span>
            </button>
          </nav>

          {viewMode === 'list' && (
            <div className="employee-list-sidebar-content">
              <Button variant="primary" onClick={handleAddEmployee} className="add-employee-button">
                Add Employee
              </Button>
            </div>
          )}
        </div>

        <div className="employee-management-content">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {viewMode === 'list' && (
            <Card className="employee-list-card" padding="none">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Branch</th>
                    <th>Employee ID</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="table-empty">
                        No employees found. Click "Add Employee" to create one.
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id}>
                        <td>{employee.name}</td>
                        <td>{employee.email}</td>
                        <td>
                          <span className={`role-badge role-badge--${employee.role}`}>{employee.role}</span>
                        </td>
                        <td>{employee.department || '-'}</td>
                        <td>{employee.branchId ? branches.find(b => b.id === employee.branchId)?.name || '-' : '-'}</td>
                      <td>{employee.employeeId || '-'}</td>
                      <td>
                        {isEmployeeOnline(employee.id) ? (
                          <span className="status-badge status-badge--online">
                            <span className="status-dot" /> Online
                          </span>
                        ) : (
                          <span className="status-badge status-badge--offline">
                            <span className="status-dot" /> Offline
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEmployee(employee.id)}
                            disabled={loading}
                          >
                            Edit
                          </Button>
                          {isEmployeeOnline(employee.id) && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleLogoutEmployee(employee)}
                              disabled={loading}
                            >
                              Logout
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(employee)}
                            disabled={loading}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          )}

          {viewMode === 'add' && (
            <Card className="employee-form-card" padding="lg">
              <div className="employee-form-header">
                <h3>Add New Employee</h3>
                <Button variant="ghost" size="sm" onClick={handleCancelForm}>
                  ← Back to List
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="employee-form">
                <div className="form-row">
                  <Input
                    label="Name *"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  <Input
                    label="Email *"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label htmlFor="role">Role *</label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      className="input"
                    >
                      <option value={UserRole.EMPLOYEE}>Employee</option>
                      <option value={UserRole.MANAGER}>Manager</option>
                      <option value={UserRole.HR}>HR</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                    </select>
                  </div>
                  <Input
                    label="Department"
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-row">
                  <Input
                    label="Employee ID"
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <Input
                    label="Designation"
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-row">
                  <Input
                    label="Phone Number"
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <Input
                    label="Password *"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label htmlFor="shiftId">Assign Shift (Optional)</label>
                    <select
                      id="shiftId"
                      name="shiftId"
                      value={selectedShiftId}
                      onChange={(e) => setSelectedShiftId(e.target.value)}
                      disabled={loading || loadingShifts}
                      className="input"
                    >
                      <option value="">-- No Shift --</option>
                      {shifts.map((shift) => (
                        <option key={shift.id} value={shift.id}>
                          {shift.name} ({shift.startTime} - {shift.endTime})
                        </option>
                      ))}
                    </select>
                    {loadingShifts && <small>Loading shifts...</small>}
                    {!loadingShifts && shifts.length === 0 && (
                      <small style={{ color: '#666' }}>No active shifts available. Create a shift first.</small>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <Button type="button" variant="secondary" onClick={handleCancelForm} disabled={loading}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Employee'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {viewMode === 'details' && (
            <div className="employee-details-wrapper">
              <div className="employee-details-header">
                <button className="back-button" onClick={handleBackToList}>
                  ← Back to List
                </button>
                <h2>Employee Details</h2>
                {employeeDetails && <p className="page-subtitle">{employeeDetails.name}</p>}
                {unsavedChanges && (
                  <div className="unsaved-indicator">
                    You have unsaved changes
                  </div>
                )}
              </div>

              {detailsError && (
                <div className="error-message">
                  {detailsError}
                </div>
              )}

              {loadingDetails && !employeeDetails ? (
                <div className="page-loading">Loading employee details...</div>
              ) : employeeDetails ? (
                <div className="employee-details-sections">
                  <ProfileSummarySection
                    employee={employeeDetails}
                    onUpdate={handleUpdate}
                    canEdit={canEdit}
                    isExpanded={sectionsExpanded.profile}
                    onToggle={() => handleSectionToggle('profile')}
                    onUnsavedChange={setUnsavedChanges}
                  />

                  <EmploymentRoleSection
                    employee={employeeDetails}
                    onUpdate={handleUpdate}
                    canEdit={canEdit}
                    isExpanded={sectionsExpanded.employment}
                    onToggle={() => handleSectionToggle('employment')}
                    onUnsavedChange={setUnsavedChanges}
                  />

                  <ShiftAttendanceSection
                    employee={employeeDetails}
                    onUpdate={handleUpdate}
                    canEdit={canEdit}
                    isExpanded={sectionsExpanded.shift}
                    onToggle={() => handleSectionToggle('shift')}
                    onUnsavedChange={setUnsavedChanges}
                  />

                  <TaskPreferencesSection
                    employee={employeeDetails}
                    onUpdate={handleUpdate}
                    canEdit={canEdit || canEditLimited}
                    isExpanded={sectionsExpanded.task}
                    onToggle={() => handleSectionToggle('task')}
                    onUnsavedChange={setUnsavedChanges}
                  />

                  <PermissionsSection
                    employee={employeeDetails}
                    onUpdate={handleUpdate}
                    canEdit={canEdit}
                    isExpanded={sectionsExpanded.permissions}
                    onToggle={() => handleSectionToggle('permissions')}
                    onUnsavedChange={setUnsavedChanges}
                  />

                  <SystemAuditSection
                    employee={employeeDetails}
                    employeeId={selectedEmployeeId!}
                    isExpanded={sectionsExpanded.audit}
                    onToggle={() => handleSectionToggle('audit')}
                  />
                </div>
              ) : (
                <div className="page-error">
                  <p>Employee not found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingUpdate && employeeDetails && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          onConfirm={handleConfirmUpdate}
          onCancel={handleCancelUpdate}
          changes={pendingUpdate.request}
          employeeName={employeeDetails.name}
        />
      )}
    </div>
  );
};
