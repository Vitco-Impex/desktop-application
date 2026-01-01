/**
 * Drag and Drop Utilities - Task drag and resize functionality
 */

import { CalendarEvent } from '@/types/calendar';

export interface DragState {
  isDragging: boolean;
  taskId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startDate: Date;
  startTime: Date;
  dragType: 'move' | 'resize-start' | 'resize-end';
}

export interface DropResult {
  newStartTime: Date;
  newEndTime: Date;
  dayChange: number; // Days moved (for week view)
  timeChange: number; // Minutes moved
  isValid: boolean;
  conflicts?: CalendarEvent[];
  warnings?: string[];
}

/**
 * Calculate drop result from drag state
 */
export function calculateDropResult(
  dragState: DragState,
  dropX: number,
  dropY: number,
  pixelsPerMinute: number,
  dayStart: Date,
  dayWidth?: number // For week view
): DropResult {
  const deltaX = dropX - dragState.startX;
  const deltaY = dropY - dragState.startY;

  let dayChange = 0;
  if (dayWidth) {
    dayChange = Math.round(deltaX / dayWidth);
  }

  const minutesChange = Math.round(deltaY / pixelsPerMinute);

  const newStartTime = new Date(dragState.startTime);
  newStartTime.setDate(newStartTime.getDate() + dayChange);
  newStartTime.setMinutes(newStartTime.getMinutes() + minutesChange);

  const originalDuration = dragState.taskId ? 60 : 60; // Default 1 hour, would need task to get actual duration
  const newEndTime = new Date(newStartTime);
  newEndTime.setMinutes(newEndTime.getMinutes() + originalDuration);

  return {
    newStartTime,
    newEndTime,
    dayChange,
    timeChange: minutesChange,
    isValid: true,
  };
}

/**
 * Calculate resize result
 */
export function calculateResizeResult(
  dragState: DragState,
  dropX: number,
  dropY: number,
  pixelsPerMinute: number,
  originalStartTime: Date,
  originalEndTime: Date
): { newStartTime: Date; newEndTime: Date; isValid: boolean } {
  const deltaY = dropY - dragState.startY;
  const minutesChange = Math.round(deltaY / pixelsPerMinute);

  if (dragState.dragType === 'resize-start') {
    const newStartTime = new Date(originalStartTime);
    newStartTime.setMinutes(newStartTime.getMinutes() + minutesChange);

    // Ensure start is before end
    if (newStartTime >= originalEndTime) {
      return {
        newStartTime: originalStartTime,
        newEndTime: originalEndTime,
        isValid: false,
      };
    }

    return {
      newStartTime,
      newEndTime: originalEndTime,
      isValid: true,
    };
  } else {
    // resize-end
    const newEndTime = new Date(originalEndTime);
    newEndTime.setMinutes(newEndTime.getMinutes() + minutesChange);

    // Ensure end is after start
    if (newEndTime <= originalStartTime) {
      return {
        newStartTime: originalStartTime,
        newEndTime: originalEndTime,
        isValid: false,
      };
    }

    return {
      newStartTime: originalStartTime,
      newEndTime,
      isValid: true,
    };
  }
}

/**
 * Throttle function for drag events
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

