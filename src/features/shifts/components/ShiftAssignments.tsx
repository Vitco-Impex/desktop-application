/**
 * Shift Assignments Component
 * Manage employee shift assignments with tabs for Current, Upcoming, and History
 */

import React, { useState, useEffect } from 'react';
import { shiftService } from '@/services/shift.service';
import { employeeService } from '@/services/employee.service';
import { ShiftAssignment, Shift } from '@/types/shift';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { authStore } from '@/store/authStore';
import { UserRole } from '@/types';
import './ShiftAssignments.css';

type AssignmentTab = 'current' | 'upcoming' | 'history';

export const ShiftAssignments: React.FC = () => {
  const { user } = authStore();
  const [activeTab, setActiveTab] = useState<AssignmentTab>('current');
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ShiftAssignment | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    shiftId: '',
    assignmentType: 'permanent' as 'permanent' | 'temporary' | 'rotational' | 'override',
    assignmentMode: 'individual' as 'individual' | 'team' | 'department' | 'role',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    reason: '',
    priority: undefined as number | undefined,
    rotationalConfig: {
      pattern: 'weekly' as 'weekly' | 'bi_weekly' | 'custom',
      cycleDays: 7,
      shiftSequence: [] as string[],
    },
  });

  const canManage = user?.role === UserRole.HR || user?.role === UserRole.ADMIN;

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const query: any = {
        status: activeTab === 'current' ? 'active' : activeTab === 'upcoming' ? 'active' : 'all',
      };

      // For current: only show assignments active today
      // For upcoming: show future assignments
      // For history: show all (completed/cancelled)
      
      if (activeTab === 'history') {
        query.status = 'all';
      }

      const [assignmentsData, shiftsData, employeesData] = await Promise.all([
        shiftService.listAssignments(query),
        shiftService.getActiveShifts(),
        employeeService.getAllEmployees(),
      ]);
      
      // Filter assignments based on tab
      let filteredAssignments = assignmentsData.assignments || [];
      if (activeTab === 'current') {
        filteredAssignments = filteredAssignments.filter(a => {
          const startDate = new Date(a.startDate);
          const endDate = a.endDate ? new Date(a.endDate) : null;
          const todayDate = new Date();
          return startDate <= todayDate && (!endDate || endDate >= todayDate);
        });
      } else if (activeTab === 'upcoming') {
        filteredAssignments = filteredAssignments.filter(a => {
          const startDate = new Date(a.startDate);
          return startDate > new Date();
        });
      }

      setAssignments(filteredAssignments);
      setShifts(shiftsData || []);
      
      // Process employees data for dropdowns
      const activeEmployees = employeesData.filter((emp: any) => emp.isActive);
      setEmployees(activeEmployees);
      
      // Extract unique departments
      const uniqueDepartments = Array.from(
        new Set(activeEmployees.map((emp: any) => emp.department).filter(Boolean))
      ).sort() as string[];
      setDepartments(uniqueDepartments);
      
      // Extract unique roles
      const uniqueRoles = Array.from(
        new Set(activeEmployees.map((emp: any) => emp.role))
      ).sort() as UserRole[];
      setRoles(uniqueRoles);
      
      // Extract managers (users with role='manager')
      const managerList = activeEmployees.filter((emp: any) => emp.role === UserRole.MANAGER);
      setManagers(managerList);
    } catch (err: any) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (editingAssignment) {
        // Update assignment
        await shiftService.updateAssignment(editingAssignment.id, {
          shiftId: formData.shiftId || undefined,
          assignmentType: formData.assignmentType,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          reason: formData.reason || undefined,
          priority: formData.priority,
          rotationalConfig: formData.assignmentType === 'rotational' ? formData.rotationalConfig : undefined,
        });
        setSuccess('Assignment updated successfully');
      } else {
        // Create assignment - prepare request based on assignment mode
        const assignmentRequest: any = {
          assignmentType: formData.assignmentType,
          assignmentMode: formData.assignmentMode,
          startDate: formData.startDate,
          endDate: formData.endDate || undefined,
          reason: formData.reason || undefined,
          priority: formData.priority,
          rotationalConfig: formData.assignmentType === 'rotational' ? formData.rotationalConfig : undefined,
        };

        // Set the appropriate field based on assignment mode
        if (formData.assignmentMode === 'individual') {
          assignmentRequest.employeeId = formData.employeeId;
        } else if (formData.assignmentMode === 'team') {
          // For team mode, we use employeeId to store the manager ID (backend will handle expansion)
          assignmentRequest.employeeId = formData.employeeId; // Backend can use this to find team members
          // Note: Backend may need to be updated to handle team expansion from manager ID
        } else if (formData.assignmentMode === 'department') {
          // For department, send department name
          assignmentRequest.department = formData.employeeId; // Using employeeId field to store department name
        } else if (formData.assignmentMode === 'role') {
          // For role, send role enum value
          assignmentRequest.role = formData.employeeId; // Using employeeId field to store role
        }

        // Add shiftId if not rotational
        if (formData.assignmentType !== 'rotational' && formData.shiftId) {
          assignmentRequest.shiftId = formData.shiftId;
        }

        const result = await shiftService.createAssignment(assignmentRequest);
        // Check for warnings
        if ((result as any).warning) {
          setSuccess(`Assignment created successfully. ${(result as any).warning}`);
        } else {
          setSuccess('Assignment created successfully');
        }
      }

      setShowForm(false);
      setEditingAssignment(null);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save assignment');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAssignment(null);
    resetForm();
  };

  const handleEdit = (assignment: ShiftAssignment) => {
    setEditingAssignment(assignment);
    // Determine the value to set in employeeId field based on assignment mode
    let employeeIdValue = '';
    if (assignment.assignmentMode === 'individual' || assignment.assignmentMode === 'team') {
      employeeIdValue = assignment.employeeId || '';
    } else if (assignment.assignmentMode === 'department') {
      employeeIdValue = assignment.department || '';
    } else if (assignment.assignmentMode === 'role') {
      employeeIdValue = assignment.role || '';
    }

    setFormData({
      employeeId: employeeIdValue,
      shiftId: assignment.shiftId || '',
      assignmentType: assignment.assignmentType,
      assignmentMode: assignment.assignmentMode || 'individual',
      startDate: assignment.startDate.split('T')[0],
      endDate: assignment.endDate?.split('T')[0] || '',
      reason: assignment.reason || '',
      priority: assignment.priority,
      rotationalConfig: assignment.rotationalConfig || {
        pattern: 'weekly',
        cycleDays: 7,
        shiftSequence: [],
      },
    });
    setShowForm(true);
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to cancel this assignment?')) {
      return;
    }

    try {
      await shiftService.cancelAssignment(assignmentId);
      setSuccess('Assignment cancelled successfully');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel assignment');
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      shiftId: '',
      assignmentType: 'permanent',
      assignmentMode: 'individual',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      reason: '',
      priority: undefined,
      rotationalConfig: {
        pattern: 'weekly',
        cycleDays: 7,
        shiftSequence: [],
      },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && assignments.length === 0) {
    return <div className="shift-assignments-loading">Loading assignments...</div>;
  }

  return (
    <div className="shift-assignments">
      <div className="shift-assignments-header">
        <div>
          <h3 className="shift-assignments-title">Shift Assignments</h3>
          <p className="shift-assignments-subtitle">Manage employee shift assignments</p>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Assign Shift
          </Button>
        )}
      </div>

      {error && (
        <div className="shift-assignments-error-message">{error}</div>
      )}

      {success && (
        <div className="shift-assignments-success-message">{success}</div>
      )}

      {/* Tabs */}
      <div className="shift-assignments-tabs">
        <button
          className={`shift-assignments-tab ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          Current
        </button>
        <button
          className={`shift-assignments-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
        </button>
        {canManage && (
          <button
            className={`shift-assignments-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        )}
      </div>

      {/* Assignment Form Modal */}
      {showForm && canManage && (
        <div className="shift-assignments-modal-overlay" onClick={handleCancel}>
          <div className="shift-assignments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="shift-assignments-modal-header">
              <h4>{editingAssignment ? 'Edit Assignment' : 'Create Assignment'}</h4>
              <button className="shift-assignments-modal-close" onClick={handleCancel}>×</button>
            </div>
            <form onSubmit={handleFormSubmit} className="shift-assignments-form">
              <div className="shift-assignments-form-field">
                <label>
                  Assignment Mode
                  <select
                    value={formData.assignmentMode}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      assignmentMode: e.target.value as any,
                      employeeId: '', // Clear selection when mode changes
                    })}
                  >
                    <option value="individual">Individual</option>
                    <option value="team">Team</option>
                    <option value="department">Department</option>
                    <option value="role">Role</option>
                  </select>
                </label>
              </div>

              {formData.assignmentMode === 'individual' && (
                <div className="shift-assignments-form-field">
                  <label>
                    Employee
                    <select
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      required
                      disabled={!!editingAssignment}
                    >
                      <option value="">Select an employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.email}) - {emp.role} {emp.department ? `- ${emp.department}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {formData.assignmentMode === 'team' && (
                <div className="shift-assignments-form-field">
                  <label>
                    Team Manager
                    <select
                      value={formData.employeeId || ''}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      required
                      disabled={!!editingAssignment}
                    >
                      <option value="">Select a team manager</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name} ({manager.email}) {manager.department ? `- ${manager.department}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small className="shift-assignments-form-hint">
                    Selecting a manager assigns the shift to all employees in their team/department
                  </small>
                </div>
              )}

              {formData.assignmentMode === 'department' && (
                <div className="shift-assignments-form-field">
                  <label>
                    Department
                    <select
                      value={formData.employeeId || ''}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      required
                      disabled={!!editingAssignment}
                    >
                      <option value="">Select a department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small className="shift-assignments-form-hint">
                    This will assign the shift to all employees in the selected department
                  </small>
                </div>
              )}

              {formData.assignmentMode === 'role' && (
                <div className="shift-assignments-form-field">
                  <label>
                    Role
                    <select
                      value={formData.employeeId || ''}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      required
                      disabled={!!editingAssignment}
                    >
                      <option value="">Select a role</option>
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small className="shift-assignments-form-hint">
                    This will assign the shift to all employees with the selected role
                  </small>
                </div>
              )}

              <div className="shift-assignments-form-field">
                <label>
                  Assignment Type
                  <select
                    value={formData.assignmentType}
                    onChange={(e) => setFormData({ ...formData, assignmentType: e.target.value as any })}
                  >
                    <option value="permanent">Permanent</option>
                    <option value="temporary">Temporary</option>
                    <option value="rotational">Rotational</option>
                    <option value="override">Override</option>
                  </select>
                </label>
              </div>

              {formData.assignmentType !== 'rotational' && (
                <div className="shift-assignments-form-field">
                  <label>
                    Shift
                    <select
                      value={formData.shiftId}
                      onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                      required={formData.assignmentType !== 'rotational'}
                    >
                      <option value="">Select a shift</option>
                      {shifts.map((shift) => (
                        <option key={shift.id} value={shift.id}>
                          {shift.name} ({shift.code})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <div className="shift-assignments-form-field">
                <label>
                  Start Date
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </label>
              </div>

              {(formData.assignmentType === 'temporary' || formData.assignmentType === 'override') && (
                <div className="shift-assignments-form-field">
                  <label>
                    End Date
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </label>
                </div>
              )}

              <div className="shift-assignments-form-field">
                <label>
                  Reason (optional)
                  <Input
                    type="text"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </label>
              </div>

              <div className="shift-assignments-form-actions">
                <Button type="button" variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingAssignment ? 'Update' : 'Create'} Assignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignments List */}
      <div className="shift-assignments-content">
        {assignments.length === 0 ? (
          <div className="shift-assignments-empty">
            No {activeTab === 'current' ? 'active' : activeTab === 'upcoming' ? 'upcoming' : ''} assignments
          </div>
        ) : (
          <div className="shift-assignments-table-wrapper">
            <table className="shift-assignments-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Shift</th>
                  <th>Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{assignment.employeeName || assignment.employeeId || 'N/A'}</td>
                    <td>{assignment.shiftName || assignment.shiftCode || 'N/A'}</td>
                    <td>
                      <span className={`shift-assignment-type-badge ${assignment.assignmentType}`}>
                        {assignment.assignmentType}
                      </span>
                    </td>
                    <td>{formatDate(assignment.startDate)}</td>
                    <td>{assignment.endDate ? formatDate(assignment.endDate) : 'Permanent'}</td>
                    <td>
                      <span className={`shift-assignment-status-badge ${assignment.status}`}>
                        {assignment.status}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <div className="shift-assignments-actions">
                          <button
                            className="shift-assignments-action-btn edit"
                            onClick={() => handleEdit(assignment)}
                          >
                            Edit
                          </button>
                          {assignment.status === 'active' && (
                            <button
                              className="shift-assignments-action-btn delete"
                              onClick={() => handleDelete(assignment.id)}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
