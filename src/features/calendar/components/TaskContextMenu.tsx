/**
 * Task Context Menu - Right-click menu for task actions
 */

import React, { useEffect, useRef } from 'react';
import { CalendarEvent, CalendarEventStatus } from '@/types/calendar';
import { UserRole } from '@/types';
import { getTaskPermissions, getValidStatusTransitions } from '../utils/taskPermissions';
import './TaskContextMenu.css';

export interface TaskContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface TaskContextMenuProps {
  task: CalendarEvent;
  userRole: UserRole;
  userId: string;
  position: { x: number; y: number };
  onClose: () => void;
  onViewDetails: (task: CalendarEvent) => void;
  onEdit: (task: CalendarEvent) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (task: CalendarEvent) => void;
  onStatusChange: (taskId: string, status: CalendarEventStatus, reason?: string) => void;
  onReassign: (task: CalendarEvent) => void;
  onReschedule: (task: CalendarEvent) => void;
  onCancel: (taskId: string, reason?: string) => void;
}

export const TaskContextMenu: React.FC<TaskContextMenuProps> = ({
  task,
  userRole,
  userId,
  position,
  onClose,
  onViewDetails,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
  onReassign,
  onReschedule,
  onCancel,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Add listeners after mount to avoid immediate close
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Position menu to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = position.x;
      let y = position.y;

      // Adjust if menu would overflow right
      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }

      // Adjust if menu would overflow bottom
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
    }
  }, [position]);

  const permissions = getTaskPermissions(userRole, userId, task);
  const validStatusTransitions = getValidStatusTransitions(task.status);

  const buildMenuActions = (): TaskContextMenuAction[] => {
    const actions: TaskContextMenuAction[] = [];

    // View details (always available)
    actions.push({
      id: 'view',
      label: 'View details',
      onClick: () => {
        onViewDetails(task);
        onClose();
      },
    });

    actions.push({ id: 'divider1', label: '', onClick: () => {} }); // Divider

    // Status change actions (for own tasks or with permission)
    if (permissions.canMarkInProgress && task.status !== CalendarEventStatus.IN_PROGRESS && validStatusTransitions.includes('in_progress')) {
      actions.push({
        id: 'mark-in-progress',
        label: 'Mark In Progress',
        onClick: () => {
          onStatusChange(task.id, CalendarEventStatus.IN_PROGRESS);
          onClose();
        },
      });
    }

    if (permissions.canMarkCompleted && task.status !== CalendarEventStatus.COMPLETED && validStatusTransitions.includes('completed')) {
      actions.push({
        id: 'mark-completed',
        label: 'Mark Completed',
        onClick: () => {
          onStatusChange(task.id, CalendarEventStatus.COMPLETED);
          onClose();
        },
      });
    }

    // Manager/HR/Admin actions
    if (permissions.canReassign) {
      actions.push({
        id: 'reassign',
        label: 'Reassign',
        onClick: () => {
          onReassign(task);
          onClose();
        },
        disabled: !permissions.canReassign,
      });
    }

    if (permissions.canReschedule) {
      actions.push({
        id: 'reschedule',
        label: 'Reschedule',
        onClick: () => {
          onReschedule(task);
          onClose();
        },
        disabled: !permissions.canReschedule,
      });
    }

    if (permissions.canCancel && task.status !== CalendarEventStatus.CANCELLED) {
      actions.push({
        id: 'cancel',
        label: 'Cancel Task',
        onClick: () => {
          // Prompt for reason if needed
          const reason = prompt('Reason for cancellation (optional):');
          onCancel(task.id, reason || undefined);
          onClose();
        },
        danger: true,
      });
    }

    if (actions.length > 2) {
      actions.push({ id: 'divider2', label: '', onClick: () => {} }); // Divider
    }

    // Common actions
    actions.push({
      id: 'edit',
      label: 'Edit',
      onClick: () => {
        onEdit(task);
        onClose();
      },
      disabled: !permissions.canEdit,
    });

    actions.push({
      id: 'duplicate',
      label: 'Duplicate',
      onClick: () => {
        onDuplicate(task);
        onClose();
      },
    });

    // Delete (HR/Admin or creator)
    if (permissions.canDelete) {
      actions.push({ id: 'divider3', label: '', onClick: () => {} }); // Divider
      actions.push({
        id: 'delete',
        label: 'Delete',
        onClick: () => {
          if (window.confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
            onDelete(task.id);
          }
          onClose();
        },
        danger: true,
        disabled: !permissions.canDelete,
      });
    }

    return actions;
  };

  const actions = buildMenuActions();

  return (
    <div ref={menuRef} className="task-context-menu" style={{ left: position.x, top: position.y }}>
      {actions.map((action, index) => {
        if (action.id.startsWith('divider')) {
          return <div key={action.id} className="task-context-menu-divider" />;
        }

        return (
          <button
            key={action.id}
            className={`task-context-menu-item ${action.danger ? 'danger' : ''} ${action.disabled ? 'disabled' : ''}`}
            onClick={action.onClick}
            disabled={action.disabled}
            type="button"
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
};

