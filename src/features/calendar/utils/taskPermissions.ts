/**
 * Task Permissions Utilities - Frontend permission checking
 */

import { UserRole } from '@/types';
import { CalendarEvent } from '@/types/calendar';

export interface TaskAction {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canReassign: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  canOverrideStatus: boolean;
  canMarkInProgress: boolean;
  canMarkCompleted: boolean;
}

/**
 * Get task action permissions based on user role and task ownership
 */
export function getTaskPermissions(
  userRole: UserRole,
  userId: string,
  task: CalendarEvent
): TaskAction {
  const isOwner = task.employeeId === userId;
  const isCreator = task.createdBy === userId;

  const permissions: TaskAction = {
    canView: true,
    canEdit: false,
    canDelete: false,
    canReassign: false,
    canReschedule: false,
    canCancel: false,
    canOverrideStatus: false,
    canMarkInProgress: false,
    canMarkCompleted: false,
  };

  switch (userRole) {
    case UserRole.EMPLOYEE:
      // Employee can edit their own tasks
      permissions.canEdit = isOwner || isCreator;
      permissions.canDelete = isCreator;
      permissions.canReschedule = isOwner || isCreator;
      permissions.canMarkInProgress = isOwner;
      permissions.canMarkCompleted = isOwner;
      break;

    case UserRole.MANAGER:
      // Manager can edit tasks they created or assigned to their team
      permissions.canEdit = isCreator || isOwner; // Note: Full team check would require department info
      permissions.canDelete = isCreator;
      permissions.canReassign = true; // Team only (would need department check)
      permissions.canReschedule = true; // Team only
      permissions.canCancel = true; // Team only
      permissions.canMarkInProgress = isOwner;
      permissions.canMarkCompleted = isOwner;
      break;

    case UserRole.HR:
    case UserRole.ADMIN:
      // HR/Admin can do everything
      permissions.canEdit = true;
      permissions.canDelete = true;
      permissions.canReassign = true;
      permissions.canReschedule = true;
      permissions.canCancel = true;
      permissions.canOverrideStatus = true;
      permissions.canMarkInProgress = true;
      permissions.canMarkCompleted = true;
      break;
  }

  return permissions;
}

/**
 * Check if user can assign tasks to a specific employee
 */
export function canAssignTo(
  userRole: UserRole,
  userId: string,
  targetEmployeeId: string
): boolean {
  if (userRole === UserRole.EMPLOYEE) {
    return userId === targetEmployeeId;
  }
  // Manager, HR, Admin can assign (team/all restrictions handled server-side)
  return true;
}

/**
 * Get valid status transitions for a task based on current status
 */
export function getValidStatusTransitions(currentStatus: string): string[] {
  const transitions: Record<string, string[]> = {
    planned: ['in_progress', 'cancelled', 'completed'],
    tentative: ['planned', 'confirmed', 'cancelled'],
    confirmed: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'blocked', 'cancelled'],
    blocked: ['in_progress', 'cancelled'],
    completed: ['in_progress'], // Reopening completed tasks
    cancelled: [], // Cannot transition from cancelled
  };

  return transitions[currentStatus] || [];
}

