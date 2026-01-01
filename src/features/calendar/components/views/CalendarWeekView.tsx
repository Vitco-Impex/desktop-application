/**
 * Calendar Week View - 7-day horizontal timeline
 */

import React, { useMemo, useState } from 'react';
import { CalendarEvent } from '@/types/calendar';
import {
  calculateEventLayout,
  getEventLayoutStyle,
  LayoutedEvent,
} from '../../utils/overlapLayout.util';
import { Tooltip } from '@/components/tooltip/Tooltip';
import './CalendarWeekView.css';

interface CalendarWeekViewProps {
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

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
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

  const pixelsPerMinute = 1;
  const hours = Array.from({ length: 24 }, (_, i) => i);

  /* ---------------------------------- */
  /* Week calculation (Monday start) */
  /* ---------------------------------- */
  const weekStart = new Date(currentDate);
  const dayOfWeek = weekStart.getDay();
  const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  /* ---------------------------------- */
  /* Helpers */
  /* ---------------------------------- */
  const formatHour = (hour: number) =>
    `${hour.toString().padStart(2, '0')}:00`;

  const formatDayHeader = (day: Date) =>
    day.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  const formatTooltipLabel = (day: Date, hour: number, minute: number) => {
    const d = new Date(day);
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
  /* Event filtering per day */
  /* ---------------------------------- */
  const getEventsForDay = useMemo(() => {
    return (day: Date) => {
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);

      const end = new Date(day);
      end.setHours(23, 59, 59, 999);

      return events.filter((e) => {
        const s = new Date(e.startTime);
        const en = new Date(e.endTime);
        return s <= end && en >= start;
      });
    };
  }, [events]);

  const getLayoutedEventsForDay = (day: Date): LayoutedEvent[] =>
    calculateEventLayout(getEventsForDay(day));

  const getEventStyle = (event: LayoutedEvent, day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    return getEventLayoutStyle(event, dayStart, pixelsPerMinute);
  };

  /* ---------------------------------- */
  /* Render */
  /* ---------------------------------- */
  return (
    <div className="calendar-week-view">
      {/* Header */}
      <div className="calendar-week-view-header">
        <div className="calendar-week-view-time-column" />
        {days.map((day, i) => (
          <div key={i} className="calendar-week-view-day-header">
            <div className="calendar-week-view-day-name">
              {formatDayHeader(day)}
            </div>
            <div className="calendar-week-view-day-number">
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="calendar-week-view-body">
        {/* Time column */}
        <div className="calendar-week-view-time-column">
          {hours.map((hour) => (
            <div key={hour} className="calendar-week-view-hour">
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, dayIdx) => {
          const layoutedEvents = getLayoutedEventsForDay(day);

          return (
            <div
              key={dayIdx}
              className="calendar-week-view-day-column calendar-week-view-day-column--positioned"
            >
              {/* Hour slots */}
              {hours.map((hour) => {
                const isHovered =
                  dragState?.isDragging &&
                  hoveredDropTarget &&
                  hoveredDropTarget.day.toDateString() ===
                    day.toDateString() &&
                  hoveredDropTarget.hour === hour;

                return (
                  <div
                    key={hour}
                    className={`calendar-week-view-hour-slot ${
                      isHovered
                        ? isValidDrop
                          ? 'drag-hover-valid'
                          : 'drag-hover-invalid'
                        : ''
                    }`}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const minute = Math.floor(y / pixelsPerMinute);

                      setTooltip({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        label: formatTooltipLabel(day, hour, minute),
                      });
                    }}
                    onMouseLeave={() =>
                      setTooltip((t) => ({ ...t, visible: false }))
                    }
                    onDoubleClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const totalMinutes = hour * 60 + y / pixelsPerMinute;

                      const h = Math.floor(totalMinutes / 60);
                      const m = Math.floor(totalMinutes % 60);

                      window.dispatchEvent(
                        new CustomEvent('calendar:create-task', {
                          detail: {
                            date: day,
                            startTime: `${h
                              .toString()
                              .padStart(2, '0')}:${m
                              .toString()
                              .padStart(2, '0')}`,
                            endTime: `${(h + 1)
                              .toString()
                              .padStart(2, '0')}:${m
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
                  dragState?.isDragging &&
                  dragState.task?.id === event.id;

                return (
                  <div
                    key={event.id}
                    className={`calendar-week-view-event ${
                      isDragging ? 'dragging' : ''
                    }`}
                    style={{
                      ...getEventStyle(event, day),
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
                    <div className="calendar-week-view-event-title">
                      {event.title}
                    </div>
                    <div className="calendar-week-view-event-time">
                      {new Date(event.startTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      <Tooltip
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
        content={tooltip.label}
      />
    </div>
  );
};
