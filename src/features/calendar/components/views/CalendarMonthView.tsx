/**
 * Calendar Month View - Calendar grid with compact event indicators
 */

import React, { useState } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { MouseTooltip } from '@/shared/components/ui';
import './CalendarMonthView.css';

interface CalendarMonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (event: CalendarEvent) => void;
  onEventDelete: (eventId: string) => void;
  onEventContextMenu?: (
    event: CalendarEvent,
    position: { x: number; y: number }
  ) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  events,
  currentDate,
  onEventClick,
  onEventContextMenu,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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

  /* ---------------------------------- */
  /* Hovered cell state */
  /* ---------------------------------- */
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);

  /* ---------------------------------- */
  /* Month grid calculation */
  /* ---------------------------------- */
  const firstDay = new Date(year, month, 1);

  const startDate = new Date(firstDay);
  const dayOfWeek = startDate.getDay();
  const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  startDate.setDate(diff);

  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d;
  });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /* ---------------------------------- */
  /* Helpers */
  /* ---------------------------------- */
  const isCurrentMonth = (day: Date) => day.getMonth() === month;

  const isToday = (day: Date) => {
    const today = new Date();
    return (
      day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    );
  };

  const getDayKey = (day: Date) =>
    `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;

  const getEventsForDay = (day: Date) => {
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

  const formatTooltipLabel = (event: CalendarEvent) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    return `${event.title}\n${start.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })} • ${start.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })} – ${end.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  /* ---------------------------------- */
  /* Render */
  /* ---------------------------------- */
  return (
    <div className="calendar-month-view">
      {/* Header */}
      <div className="calendar-month-view-header">
        {weekDays.map((day) => (
          <div key={day} className="calendar-month-view-weekday">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="calendar-month-view-grid">
        {days.map((day, idx) => {
          const dayKey = getDayKey(day);
          const dayEvents = getEventsForDay(day);

          const isHovered = hoveredDayKey === dayKey;

          return (
            <div
              key={idx}
              className={`calendar-month-view-day
                ${!isCurrentMonth(day) ? 'other-month' : ''}
                ${isToday(day) ? 'today' : ''}
                ${isHovered ? 'hovered' : ''}
              `}
              onMouseEnter={() => setHoveredDayKey(dayKey)}
              onMouseLeave={() => setHoveredDayKey(null)}
              onDoubleClick={() => {
                window.dispatchEvent(
                  new CustomEvent('calendar:create-task', {
                    detail: { date: day },
                  })
                );
              }}
            >
              <div className="calendar-month-view-day-number">
                {day.getDate()}
              </div>

              <div className="calendar-month-view-day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="calendar-month-view-event-indicator"
                    onMouseMove={(e) =>
                      setTooltip({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        label: formatTooltipLabel(event),
                      })
                    }
                    onMouseLeave={() =>
                      setTooltip((t) => ({ ...t, visible: false }))
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEventContextMenu?.(event, {
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                  >
                    {event.title}
                  </div>
                ))}

                {dayEvents.length > 3 && (
                  <div className="calendar-month-view-more-indicator">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
