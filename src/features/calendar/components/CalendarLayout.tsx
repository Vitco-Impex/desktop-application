/**
 * Calendar Layout - Main layout with sidebar and calendar view
 */

import React, { useState, useEffect } from 'react';
import { CalendarEvent, CalendarViewMode, CalendarEventStatus, CalendarEventPriority } from '@/types/calendar';
import { CalendarSidebar } from './CalendarSidebar';
import { CalendarView } from './CalendarView';
import { TaskForm } from './TaskForm';
import { QuickAddTaskPanel } from './QuickAddTaskPanel';
import { TaskContextMenu } from './TaskContextMenu';
import { CalendarFiltersState } from './CalendarFilters';
import { calendarService } from '@/services/calendar.service';
import { authStore } from '@/store/authStore';
import { UserRole } from '@/types';
import { undoSystem } from '../utils/undoSystem';
import { useKeyboardShortcuts, createCalendarShortcuts } from '../hooks/useKeyboardShortcuts';
import './CalendarLayout.css';

/**
 * Status-based color mapping for calendar events
 * Centralized in CalendarLayout to ensure consistency across all views
 */
const getStatusColor = (status: CalendarEventStatus): string => {
  const statusColors: Record<CalendarEventStatus, string> = {
    [CalendarEventStatus.PLANNED]: '#2563eb',      // Blue - Scheduled, not started
    [CalendarEventStatus.IN_PROGRESS]: '#059669',  // Green - Actively being worked on
    [CalendarEventStatus.BLOCKED]: '#dc2626',      // Red - Work cannot continue
    [CalendarEventStatus.COMPLETED]: '#6b7280',    // Gray - Finished
    [CalendarEventStatus.CANCELLED]: '#9ca3af',    // Muted gray - Cancelled
    [CalendarEventStatus.TENTATIVE]: '#d97706',    // Orange - Tentative
    [CalendarEventStatus.CONFIRMED]: '#2563eb',    // Blue - Confirmed
  };
  return statusColors[status] || '#6b7280'; // Default to gray
};

/**
 * Get status-based styles for calendar event
 * Returns object with backgroundColor, text color, and additional styles
 */
const getEventStatusStyles = (event: CalendarEvent): React.CSSProperties => {
  const backgroundColor = getStatusColor(event.status);
  const isCompleted = event.status === CalendarEventStatus.COMPLETED;
  const isCancelled = event.status === CalendarEventStatus.CANCELLED;
  
  // Determine text color (white for dark backgrounds, dark for light backgrounds)
  const textColor = '#ffffff'; // White text works well on all status colors
  
  const styles: React.CSSProperties = {
    backgroundColor,
    color: textColor,
    opacity: isCompleted ? 0.7 : 1, // Reduced opacity for completed
  };
  
  // Add border for high priority
  if (event.priority === CalendarEventPriority.HIGH || event.priority === CalendarEventPriority.URGENT) {
    styles.borderWidth = '2px';
    styles.borderStyle = 'solid';
    styles.borderColor = event.priority === CalendarEventPriority.URGENT ? '#dc2626' : '#f59e0b';
  }
  
  // Dashed border for cancelled
  if (isCancelled) {
    styles.borderStyle = 'dashed';
    styles.borderWidth = '1px';
    styles.borderColor = '#9ca3af';
  }
  
  return styles;
};

interface CalendarLayoutProps {
  events: CalendarEvent[];
  currentDate: Date;
  viewMode: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onEventCreate: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
  loading?: boolean;
  onFiltersChange?: (filters: CalendarFiltersState) => void;
}

export const CalendarLayout: React.FC<CalendarLayoutProps> = ({
  events,
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  loading,
  onFiltersChange,
}) => {
  // Get user from auth store - using getState() since we're not subscribing to changes
  const user = (authStore.getState() as any).user;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showQuickAddPanel, setShowQuickAddPanel] = useState(false);
  const [editingTask, setEditingTask] = useState<CalendarEvent | undefined>();
  const [taskFormInitialDate, setTaskFormInitialDate] = useState<Date | undefined>();
  const [quickAddInitialDate, setQuickAddInitialDate] = useState<Date | undefined>();
  const [quickAddStartTime, setQuickAddStartTime] = useState<string | undefined>();
  const [quickAddEndTime, setQuickAddEndTime] = useState<string | undefined>();
  const [contextMenuState, setContextMenuState] = useState<{
    task: CalendarEvent;
    position: { x: number; y: number };
  } | null>(null);
  
  // Drag & Drop state
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    task: CalendarEvent | null;
    originalStartTime: Date;
    originalEndTime: Date;
    dragStartX: number;
    dragStartY: number;
  } | null>(null);
  const [hoveredDropTarget, setHoveredDropTarget] = useState<{
    day: Date;
    hour: number;
    minute: number;
  } | null>(null);
  const [isValidDrop, setIsValidDrop] = useState(true);
  
  const filtersInitializedRef = React.useRef(false);
  
  // Initialize filters from localStorage or defaults
  const getInitialFilters = (): CalendarFiltersState => {
    try {
      const savedFilters = localStorage.getItem('calendar-filters');
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    }
    return {
      assignedTo: [],
      assignedBy: [],
      status: [],
      priority: [],
      type: [],
      dateRange: {},
    };
  };

  const [filters, setFilters] = useState<CalendarFiltersState>(getInitialFilters);

  // Keyboard shortcuts
  const shortcuts = createCalendarShortcuts({
    onNewTask: () => {
      setQuickAddInitialDate(currentDate);
      setQuickAddStartTime(undefined);
      setQuickAddEndTime(undefined);
      setShowQuickAddPanel(true);
    },
    onCloseModal: () => {
      if (showTaskForm) {
        setShowTaskForm(false);
        setEditingTask(undefined);
      }
      if (showQuickAddPanel) {
        setShowQuickAddPanel(false);
      }
      setContextMenuState(null);
    },
    onNextDay: () => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      onDateChange(nextDate);
    },
    onPreviousDay: () => {
      const prevDate = new Date(currentDate);
      prevDate.setDate(prevDate.getDate() - 1);
      onDateChange(prevDate);
    },
    onNextWeek: () => {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      onDateChange(nextWeek);
    },
    onPreviousWeek: () => {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      onDateChange(prevWeek);
    },
  });

  useKeyboardShortcuts(shortcuts, !showTaskForm && !showQuickAddPanel && !contextMenuState);

  useEffect(() => {
    const handleCreateTask = (e: CustomEvent) => {
      const { date, startTime, endTime } = e.detail || {};
      setQuickAddInitialDate(date || currentDate);
      setQuickAddStartTime(startTime);
      setQuickAddEndTime(endTime);
      setEditingTask(undefined);
      setShowQuickAddPanel(true);
    };

    window.addEventListener('calendar:create-task', handleCreateTask as EventListener);

    // Notify parent of initial filters after mount
    if (!filtersInitializedRef.current && onFiltersChange) {
      filtersInitializedRef.current = true;
      onFiltersChange(filters);
    }

    return () => {
      window.removeEventListener('calendar:create-task', handleCreateTask as EventListener);
    };
  }, [currentDate]);

  // Save filters to localStorage and notify parent when they change (after initialization)
  const prevFiltersRef = React.useRef<string>('');
  useEffect(() => {
    const filtersStr = JSON.stringify(filters);
    // Only trigger if filters actually changed (compare JSON strings to avoid infinite loops)
    if (filtersInitializedRef.current && filtersStr !== prevFiltersRef.current) {
      prevFiltersRef.current = filtersStr;
      localStorage.setItem('calendar-filters', filtersStr);
      if (onFiltersChange) {
        onFiltersChange(filters);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // Only depend on filters, not onFiltersChange to avoid infinite loop

  const handleTaskFormSuccess = (task: CalendarEvent) => {
    if (editingTask) {
      onEventUpdate(task);
    } else {
      onEventCreate(task);
    }
    setShowTaskForm(false);
    setEditingTask(undefined);
    setTaskFormInitialDate(undefined);
  };

  const handleQuickAddSuccess = (task: CalendarEvent) => {
    onEventCreate(task);
    setShowQuickAddPanel(false);
    setQuickAddInitialDate(undefined);
    setQuickAddStartTime(undefined);
    setQuickAddEndTime(undefined);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingTask(event);
    setTaskFormInitialDate(new Date(event.startTime));
    setShowTaskForm(true);
  };

  const handleEventContextMenu = (event: CalendarEvent, position: { x: number; y: number }) => {
    setContextMenuState({ task: event, position });
  };

  const handleDuplicate = async (task: CalendarEvent) => {
    try {
      const newStartTime = new Date(task.startTime);
      const newEndTime = new Date(task.endTime);
      
      // Prompt for new date/time or use current
      const newDate = prompt('Enter new date (YYYY-MM-DD) or press Enter to use current date:', 
        new Date().toISOString().split('T')[0]);
      
      if (newDate) {
        const [year, month, day] = newDate.split('-').map(Number);
        newStartTime.setFullYear(year, month - 1, day);
        newEndTime.setFullYear(year, month - 1, day);
      }

      const duplicateRequest = {
        title: `${task.title} (Copy)`,
        description: task.description,
        employeeId: task.employeeId,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
        type: task.type,
        priority: task.priority,
        status: CalendarEventStatus.PLANNED, // Reset to planned for duplicate
        projectId: task.projectId,
      };

      const duplicatedTask = await calendarService.createEvent(duplicateRequest);
      onEventCreate(duplicatedTask);
    } catch (error: any) {
      alert(`Failed to duplicate task: ${error.message}`);
    }
  };

  const handleStatusChange = async (taskId: string, status: CalendarEventStatus, _reason?: string) => {
    const task = events.find((e) => e.id === taskId);
    if (!task) return;

    const previousStatus = task.status;
    
    // Optimistic update
    const optimisticTask = { ...task, status };
    onEventUpdate(optimisticTask);

    // Add undo action
    undoSystem.add({
      id: `status-${taskId}-${Date.now()}`,
      label: `Undo status change to ${status}`,
      undo: () => {
        const revertTask = { ...task, status: previousStatus };
        onEventUpdate(revertTask);
      },
    });

    try {
      const updatedTask = await calendarService.updateEvent(taskId, { status });
      onEventUpdate(updatedTask);
    } catch (error: any) {
      // Revert on error
      const revertTask = { ...task, status: previousStatus };
      onEventUpdate(revertTask);
      alert(`Failed to update status: ${error.message}`);
    }
  };

  const handleDelete = async (taskId: string) => {
    const task = events.find((e) => e.id === taskId);
    if (!task) return;

    try {
      await calendarService.deleteEvent(taskId);
      onEventDelete(taskId);
    } catch (error: any) {
      alert(`Failed to delete task: ${error.message}`);
    }
  };

  const handleReassign = (task: CalendarEvent) => {
    setEditingTask(task);
    setTaskFormInitialDate(new Date(task.startTime));
    setShowTaskForm(true);
  };

  const handleReschedule = (task: CalendarEvent) => {
    setEditingTask(task);
    setTaskFormInitialDate(new Date(task.startTime));
    setShowTaskForm(true);
  };

  const handleCancel = async (taskId: string, _reason?: string) => {
    await handleStatusChange(taskId, CalendarEventStatus.CANCELLED, _reason);
  };

  // Drag & Drop handlers
  const handleDragStart = (task: CalendarEvent, e: React.MouseEvent) => {
    // Prevent drag if clicking on context menu
    if ((e.target as HTMLElement).closest('.task-context-menu')) {
      return;
    }

    setDragState({
      isDragging: true,
      task,
      originalStartTime: new Date(task.startTime),
      originalEndTime: new Date(task.endTime),
      dragStartX: e.clientX,
      dragStartY: e.clientY,
    });
    
    // Set cursor to grabbing globally
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleDragMove = React.useCallback((e: MouseEvent) => {
    if (!dragState || !dragState.task) return;

    // Find calendar week view body element
    const calendarBodyElement = document.querySelector('.calendar-week-view-body') || 
                                document.querySelector('.calendar-day-view-body');
    if (!calendarBodyElement) return;

    const rect = calendarBodyElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Account for time column width (60px)
    const timeColumnWidth = 60;
    const adjustedX = x - timeColumnWidth;

    if (adjustedX < 0 || y < 0) {
      setHoveredDropTarget(null);
      return;
    }

    const pixelsPerMinute = 1; // From the view components
    
    if (viewMode === 'week') {
      // For week view, calculate day from x position
      const dayColumnWidth = (rect.width - timeColumnWidth) / 7;
      const dayIndex = Math.max(0, Math.min(6, Math.floor(adjustedX / dayColumnWidth)));
      
      // Calculate time from y position (accounting for scroll if any)
      const scrollTop = calendarBodyElement.scrollTop || 0;
      const totalY = y + scrollTop;
      const minutesFromTop = totalY / pixelsPerMinute;
      const hour = Math.max(0, Math.min(23, Math.floor(minutesFromTop / 60)));
      const minute = Math.max(0, Math.min(59, Math.floor((minutesFromTop % 60))));
      
      // Calculate new date based on current view's week start
      const weekStart = new Date(currentDate);
      const dayOfWeek = weekStart.getDay();
      const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      
      const targetDay = new Date(weekStart);
      targetDay.setDate(weekStart.getDate() + dayIndex);

      setHoveredDropTarget({
        day: targetDay,
        hour,
        minute,
      });

      // Basic validation (can be enhanced with permission checks)
      setIsValidDrop(true);
    } else if (viewMode === 'day') {
      // For day view, no day calculation needed
      const scrollTop = calendarBodyElement.scrollTop || 0;
      const totalY = y + scrollTop;
      const minutesFromTop = totalY / pixelsPerMinute;
      const hour = Math.max(0, Math.min(23, Math.floor(minutesFromTop / 60)));
      const minute = Math.max(0, Math.min(59, Math.floor((minutesFromTop % 60))));
      
      const targetDay = new Date(currentDate);
      targetDay.setHours(0, 0, 0, 0);

      setHoveredDropTarget({
        day: targetDay,
        hour,
        minute,
      });

      setIsValidDrop(true);
    }
  }, [dragState, viewMode, currentDate]);

  const handleDragEnd = async () => {
    const currentDragState = dragState;
    const currentHoveredTarget = hoveredDropTarget;

    if (!currentDragState || !currentDragState.task) {
      // Cleanup
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setDragState(null);
      setHoveredDropTarget(null);
      return;
    }

    // Restore cursor
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Clear state immediately to prevent further drag moves
    setDragState(null);
    setHoveredDropTarget(null);

    if (!currentHoveredTarget) {
      // No valid drop target - task stays in original position
      return;
    }

    try {
      // Calculate new times
      const duration = currentDragState.originalEndTime.getTime() - currentDragState.originalStartTime.getTime();
      const newStartTime = new Date(currentHoveredTarget.day);
      newStartTime.setHours(currentHoveredTarget.hour, currentHoveredTarget.minute, 0, 0);
      const newEndTime = new Date(newStartTime.getTime() + duration);

      // Optimistic update
      const optimisticTask: CalendarEvent = {
        ...currentDragState.task,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      };
      onEventUpdate(optimisticTask);

      // Add undo action
      const taskToRevert = currentDragState.task;
      undoSystem.add({
        id: `drag-${taskToRevert.id}-${Date.now()}`,
        label: 'Undo move task',
        undo: () => {
          const revertTask: CalendarEvent = {
            ...taskToRevert,
            startTime: currentDragState.originalStartTime.toISOString(),
            endTime: currentDragState.originalEndTime.toISOString(),
          };
          onEventUpdate(revertTask);
        },
      });

      // Persist change
      const updatedTask = await calendarService.updateEvent(currentDragState.task.id, {
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      });
      onEventUpdate(updatedTask);
    } catch (error: any) {
      // Revert on error
      const revertTask: CalendarEvent = {
        ...currentDragState.task,
        startTime: currentDragState.originalStartTime.toISOString(),
        endTime: currentDragState.originalEndTime.toISOString(),
      };
      onEventUpdate(revertTask);
      alert(`Failed to move task: ${error.message}`);
    }
  };

  // Attach global drag handlers
  useEffect(() => {
    if (dragState?.isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        e.preventDefault();
        handleDragMove(e);
      };

      const handleMouseUp = () => {
        handleDragEnd();
      };

      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    } else {
      // Cleanup when not dragging
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [dragState?.isDragging, handleDragMove, handleDragEnd]);

  if (!user) {
    return null;
  }

  return (
    <div className="calendar-layout">
      <CalendarSidebar
        currentDate={currentDate}
        viewMode={viewMode}
        onDateChange={onDateChange}
        onViewModeChange={onViewModeChange}
        onEventCreate={onEventCreate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        filters={filters}
        onFiltersChange={setFilters}
      />
      <CalendarView
        events={events}
        currentDate={currentDate}
        viewMode={viewMode}
        onEventClick={handleEventClick}
        onEventUpdate={onEventUpdate}
        onEventDelete={onEventDelete}
        onEventContextMenu={handleEventContextMenu}
        onEventDragStart={handleDragStart}
        dragState={dragState}
        hoveredDropTarget={hoveredDropTarget}
        isValidDrop={isValidDrop}
        getEventStatusStyles={getEventStatusStyles}
        getStatusColor={getStatusColor}
        loading={loading}
        sidebarCollapsed={sidebarCollapsed}
      />
      {showTaskForm && (
        <TaskForm
          task={editingTask}
          initialDate={taskFormInitialDate}
          onClose={() => {
            setShowTaskForm(false);
            setEditingTask(undefined);
            setTaskFormInitialDate(undefined);
          }}
          onSuccess={handleTaskFormSuccess}
        />
      )}
      {showQuickAddPanel && quickAddInitialDate && (
        <QuickAddTaskPanel
          initialDate={quickAddInitialDate}
          initialStartTime={quickAddStartTime}
          initialEndTime={quickAddEndTime}
          onClose={() => {
            setShowQuickAddPanel(false);
            setQuickAddInitialDate(undefined);
            setQuickAddStartTime(undefined);
            setQuickAddEndTime(undefined);
          }}
          onSuccess={handleQuickAddSuccess}
        />
      )}
      {contextMenuState && (
        <TaskContextMenu
          task={contextMenuState.task}
          userRole={user.role as UserRole}
          userId={user.id}
          position={contextMenuState.position}
          onClose={() => setContextMenuState(null)}
          onViewDetails={handleEventClick}
          onEdit={handleEventClick}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onStatusChange={handleStatusChange}
          onReassign={handleReassign}
          onReschedule={handleReschedule}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

