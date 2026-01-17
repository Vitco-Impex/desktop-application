/**
 * Calendar Day View - Single day with hourly slots
 */

import React, { useMemo, useState } from 'react';
import { CalendarEvent } from '@/types/calendar';
import {
  calculateEventLayout,
  getEventLayoutStyle,
  LayoutedEvent,
} from '../../utils/overlapLayout.util';
import { MouseTooltip } from '@/shared/components/ui';
import './CalendarDayView.css';

interface CalendarDayViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
  onEventContextMenu?: (
    event: CalendarEvent,
    position: { x: number; y: number }
  ) => void;
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
}

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  events,
  currentDate,
  onEventClick,
  onEventContextMenu,
  onEventDragStart,
  dragState,
  hoveredDropTarget,
  isValidDrop = true,
  getEventStatusStyles,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const pixelsPerMinute = 1;

  /* ---------------------------------- */
  /* Tooltip state */
  /* ---------------------------------- */
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    label: '',
  });

  const formatTooltipLabel = (date: Date, hour: number, minute: number) => {
    const d = new Date(date);
    d.setHours(hour, minute, 0, 0);

    return d.toLocaleString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /* ---------------------------------- */
  /* Day boundaries */
  /* ---------------------------------- */
  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(currentDate);
  dayEnd.setHours(23, 59, 59, 999);

  /* ---------------------------------- */
  /* Filter events for the day */
  /* ---------------------------------- */
  const dayEvents = useMemo(() => {
    return events.filter((event) => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      return start <= dayEnd && end >= dayStart;
    });
  }, [events, dayStart, dayEnd]);

  /* ---------------------------------- */
  /* Overlap layout */
  /* ---------------------------------- */
  const layoutedEvents = useMemo(
    () => calculateEventLayout(dayEvents),
    [dayEvents]
  );

  const getEventStyle = (event: LayoutedEvent): React.CSSProperties =>
    getEventLayoutStyle(event, dayStart, pixelsPerMinute);

  const formatHourLabel = (hour: number) =>
    `${hour.toString().padStart(2, '0')}:00`;

  /* ---------------------------------- */
  /* Render */
  /* ---------------------------------- */
  return (
    <div className="calendar-day-view">
      {/* Header */}
      <div className="calendar-day-view-header">
        <div className="calendar-day-view-time-column" />
        <div className="calendar-day-view-day-header">
          <div className="calendar-day-view-day-name">
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="calendar-day-view-body">
        {/* Time column */}
        <div className="calendar-day-view-time-column">
          {hours.map((hour) => (
            <div key={hour} className="calendar-day-view-hour">
              {formatHourLabel(hour)}
            </div>
          ))}
        </div>

        {/* Day column */}
        <div className="calendar-day-view-day-column calendar-day-view-day-column--positioned">
          {/* Hour slots */}
          {hours.map((hour) => {
            const isHovered =
              dragState?.isDragging &&
              hoveredDropTarget &&
              hoveredDropTarget.day.toDateString() ===
                currentDate.toDateString() &&
              hoveredDropTarget.hour === hour;

            const hoverClass = isHovered
              ? isValidDrop
                ? 'drag-hover-valid'
                : 'drag-hover-invalid'
              : '';

            return (
              <div
                key={hour}
                className={`calendar-day-view-hour-slot ${hoverClass}`}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const minute = Math.floor(y / pixelsPerMinute);

                  setTooltip({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    label: formatTooltipLabel(currentDate, hour, minute),
                  });
                }}
                onMouseLeave={() =>
                  setTooltip((prev) => ({ ...prev, visible: false }))
                }
                onDoubleClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const totalMinutes = hour * 60 + clickY / pixelsPerMinute;

                  const startHour = Math.floor(totalMinutes / 60);
                  const startMinute = Math.floor(totalMinutes % 60);
                  const endHour = startHour + 1;

                  window.dispatchEvent(
                    new CustomEvent('calendar:create-task', {
                      detail: {
                        date: currentDate,
                        startTime: `${startHour
                          .toString()
                          .padStart(2, '0')}:${startMinute
                          .toString()
                          .padStart(2, '0')}`,
                        endTime: `${endHour
                          .toString()
                          .padStart(2, '0')}:${startMinute
                          .toString()
                          .padStart(2, '0')}`,
                      },
                    })
                  );
                }}
              />
            );
          })}

          {/* Events */}
          {layoutedEvents.map((event) => {
            const isDragging =
              dragState?.isDragging && dragState.task?.id === event.id;

            return (
              <div
                key={event.id}
                className={`calendar-day-view-event ${
                  isDragging ? 'dragging' : ''
                }`}
                style={{
                  ...getEventStyle(event),
                  ...getEventStatusStyles(event),
                  cursor: isDragging ? 'grabbing' : 'grab',
                  opacity: isDragging ? 0.5 : undefined,
                  zIndex: isDragging ? 1000 : 1,
                }}
                onMouseDown={(e) => {
                  if (onEventDragStart && e.button === 0) {
                    onEventDragStart(event, e);
                  }
                }}
                onClick={() => {
                  if (!dragState?.isDragging) {
                    onEventClick(event);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onEventContextMenu?.(event, {
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
              >
                <div className="calendar-day-view-event-title">
                  {event.title}
                </div>
                <div className="calendar-day-view-event-time">
                  {new Date(event.startTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  –{' '}
                  {new Date(event.endTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      <MouseTooltip
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
        content={tooltip.label}
      />
    </div>
  );
};
