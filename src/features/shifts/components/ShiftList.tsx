/**
 * Shift List Component
 * Displays all shifts in a table and allows CRUD operations
 */

import React, { useState, useEffect } from 'react';
import { shiftService } from '@/services/shift.service';
import { Shift } from '@/types/shift';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/ui/Select';
import { LoadingState, EmptyState } from '@/shared/components/data-display';
import { formatTime } from '@/utils/date';
import { extractErrorMessage } from '@/utils/error';
import { ShiftForm } from './ShiftForm';
import './ShiftList.css';

interface ShiftListProps {
  canManage: boolean;
  onShiftSelect?: (shiftId: string | null) => void;
  selectedShiftId?: string | null;
}

export const ShiftList: React.FC<ShiftListProps> = ({ canManage, onShiftSelect, selectedShiftId }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');

  useEffect(() => {
    loadShifts();
  }, [statusFilter]);

  const loadShifts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await shiftService.listShifts({ status: statusFilter });
      setShifts(response.shifts);
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to load shifts'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingShift(null);
    setShowForm(true);
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setShowForm(true);
  };

  const handleDelete = async (shift: Shift) => {
    if (!window.confirm(`Are you sure you want to delete shift "${shift.name}"?`)) {
      return;
    }

    try {
      await shiftService.deleteShift(shift.id);
      await loadShifts();
      if (onShiftSelect) {
        onShiftSelect(null);
      }
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err, 'Failed to delete shift');
      alert(errorMessage);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingShift(null);
  };

  const handleFormSuccess = async (createdShiftId?: string) => {
    handleFormClose();
    await loadShifts();
    // If a shift was just created, select it
    if (createdShiftId && onShiftSelect) {
      onShiftSelect(createdShiftId);
    }
  };


  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const getWorkingDaysLabel = (days: number[]): string => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(d => dayNames[d]).join(', ');
  };

  if (showForm) {
    return (
      <ShiftForm
        shift={editingShift || undefined}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    );
  }

  return (
    <div className="shift-list">
      <div className="shift-list-header">
        <div className="shift-list-filters">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | 'all')}
            options={[
              { value: 'all', label: 'All Shifts' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
        {canManage && (
          <Button variant="primary" size="md" onClick={handleCreate}>
            + Create Shift
          </Button>
        )}
      </div>

      {error && <div className="shift-list-error">{error}</div>}

      {loading ? (
        <LoadingState message="Loading shifts..." />
      ) : shifts.length === 0 ? (
        <EmptyState
          title="No shifts found"
          message="Create your first shift to get started."
        />
      ) : (
        <div className="shift-list-table-wrapper">
          <table className="shift-list-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Time</th>
                <th>Hours</th>
                <th>Working Days</th>
                <th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr
                  key={shift.id}
                  className={selectedShiftId === shift.id ? 'selected' : ''}
                  onClick={() => {
                    if (onShiftSelect) {
                      onShiftSelect(shift.id);
                    }
                  }}
                >
                  <td className="shift-code">{shift.code}</td>
                  <td className="shift-name">{shift.name}</td>
                  <td className="shift-time">
                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                  </td>
                  <td className="shift-hours">{formatHours(shift.totalHours)}</td>
                  <td className="shift-days">{getWorkingDaysLabel(shift.workingDays)}</td>
                  <td>
                    <span className={`shift-status shift-status--${shift.status}`}>
                      {shift.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="shift-actions">
                      <button
                        className="shift-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(shift);
                        }}
                        title="Edit shift"
                      >
                        ✏️
                      </button>
                      <button
                        className="shift-action-btn shift-action-btn--danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(shift);
                        }}
                        title="Delete shift"
                      >
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

