/**
 * Calendar View - Main calendar display area
 */

import React from 'react';
import { CalendarEvent, CalendarViewMode } from '@/types/calendar';
import { CalendarWeekView } from './views/CalendarWeekView';
import { CalendarDayView } from './views/CalendarDayView';
import { CalendarMonthView } from './views/CalendarMonthView';
import './CalendarView.css';

interface CalendarViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  viewMode: CalendarViewMode;
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
  onEventContextMenu?: (event: CalendarEvent, position: { x: number; y: number }) => void;
  onEventDragStart?: (event: CalendarEvent, e: React.MouseEvent) => void;
  dragState?: {
    isDragging: boolean;
    task: CalendarEvent | null;
    originalStartTime: Date;
    originalEndTime: Date;
    dragStartX: number;
    dragStartY: number;
  } | null;
  hoveredDropTarget?: {
    day: Date;
    hour: number;
    minute: number;
  } | null;
  isValidDrop?: boolean;
  getEventStatusStyles: (event: CalendarEvent) => React.CSSProperties;
  getStatusColor: (status: CalendarEventStatus) => string;
  loading?: boolean;
  sidebarCollapsed: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  currentDate,
  viewMode,
  onEventClick,
  onEventUpdate,
  onEventDelete,
  onEventContextMenu,
  onEventDragStart,
  dragState,
  hoveredDropTarget,
  isValidDrop,
  getEventStatusStyles,
  getStatusColor,
  loading,
  sidebarCollapsed,
}) => {
  const renderView = () => {
    switch (viewMode) {
      case 'day':
        return (
          <CalendarDayView
            events={events}
            currentDate={currentDate}
            onEventClick={onEventClick}
            onEventUpdate={onEventUpdate}
            onEventDelete={onEventDelete}
            onEventContextMenu={onEventContextMenu}
            onEventDragStart={onEventDragStart}
            dragState={dragState}
            hoveredDropTarget={hoveredDropTarget}
            isValidDrop={isValidDrop}
            getEventStatusStyles={getEventStatusStyles}
          />
        );
      case 'week':
        return (
          <CalendarWeekView
            events={events}
            currentDate={currentDate}
            onEventClick={onEventClick}
            onEventUpdate={onEventUpdate}
            onEventDelete={onEventDelete}
            onEventContextMenu={onEventContextMenu}
            onEventDragStart={onEventDragStart}
            dragState={dragState}
            hoveredDropTarget={hoveredDropTarget}
            isValidDrop={isValidDrop}
            getEventStatusStyles={getEventStatusStyles}
          />
        );
      case 'month':
        return (
          <CalendarMonthView
            events={events}
            currentDate={currentDate}
            onEventClick={onEventClick}
            onEventUpdate={onEventUpdate}
            onEventDelete={onEventDelete}
            onEventContextMenu={onEventContextMenu}
          />
        );
      default:
        return <div>Timeline view coming soon</div>;
    }
  };

  return (
    <div className="calendar-view">
      {loading && (
        <div className="calendar-view-loading">
          Loading calendar events...
        </div>
      )}
      {renderView()}
    </div>
  );
};

