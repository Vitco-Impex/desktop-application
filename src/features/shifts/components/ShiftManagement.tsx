/**
 * Shift Management Component
 * Main component with tabs for different shift management sections
 */

import React, { useState } from 'react';
import { ShiftList } from './ShiftList';
import { ShiftRules } from './ShiftRules';
import { ShiftBreaks } from './ShiftBreaks';
import { ShiftOvertime } from './ShiftOvertime';
import { ShiftAssignments } from './ShiftAssignments';
import { authStore } from '@/store/authStore';
import { UserRole } from '@/types';
import './ShiftManagement.css';

type ShiftTab = 'list' | 'rules' | 'breaks' | 'overtime' | 'assignments';

export const ShiftManagement: React.FC = () => {
  const { user } = authStore();
  const [activeTab, setActiveTab] = useState<ShiftTab>('list');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  const canManageShifts = user?.role === UserRole.HR || user?.role === UserRole.ADMIN;
  const canViewShifts = user?.role !== undefined; // All authenticated users can view

  if (!canViewShifts) {
    return (
      <div className="shift-management">
        <div className="shift-management-error">You don't have permission to view shift management.</div>
      </div>
    );
  }

  const tabs = [
    { id: 'list' as const, label: 'Shifts', icon: '📋' },
    ...(canManageShifts ? [
      { id: 'rules' as const, label: 'Rules', icon: '⚙️' },
      { id: 'breaks' as const, label: 'Breaks', icon: '☕' },
      { id: 'overtime' as const, label: 'Overtime', icon: '⏰' },
      { id: 'assignments' as const, label: 'Assignments', icon: '👥' },
    ] : []),
  ];

  return (
    <div className="shift-management">
      <div className="shift-management-header">
        <div>
          <h2 className="shift-management-title">Shift Management</h2>
          <p className="shift-management-subtitle">Configure shifts, rules, and assignments</p>
        </div>
      </div>

      <div className="shift-management-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`shift-management-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              // Don't reset selection when switching tabs - keep it so user can configure selected shift
            }}
          >
            <span className="shift-tab-icon">{tab.icon}</span>
            <span className="shift-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="shift-management-content">
        {activeTab === 'list' && (
          <ShiftList
            canManage={canManageShifts}
            onShiftSelect={setSelectedShiftId}
            selectedShiftId={selectedShiftId}
          />
        )}
        {activeTab === 'rules' && canManageShifts && (
          <>
            {selectedShiftId ? (
              <ShiftRules shiftId={selectedShiftId} />
            ) : (
              <div className="shift-management-message">
                <p>Select a shift from the list to configure rules</p>
                <p className="shift-management-hint">Go to the "Shifts" tab, select a shift, then return here.</p>
              </div>
            )}
          </>
        )}
        {activeTab === 'breaks' && canManageShifts && (
          <>
            {selectedShiftId ? (
              <ShiftBreaks shiftId={selectedShiftId} />
            ) : (
              <div className="shift-management-message">
                <p>Select a shift from the list to configure breaks</p>
                <p className="shift-management-hint">Go to the "Shifts" tab, select a shift, then return here.</p>
              </div>
            )}
          </>
        )}
        {activeTab === 'overtime' && canManageShifts && (
          <>
            {selectedShiftId ? (
              <ShiftOvertime shiftId={selectedShiftId} />
            ) : (
              <div className="shift-management-message">
                <p>Select a shift from the list to configure overtime</p>
                <p className="shift-management-hint">Go to the "Shifts" tab, select a shift, then return here.</p>
              </div>
            )}
          </>
        )}
        {activeTab === 'assignments' && canManageShifts && (
          <ShiftAssignments />
        )}
      </div>
    </div>
  );
};

