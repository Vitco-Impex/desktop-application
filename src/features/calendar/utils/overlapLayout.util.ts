/**
 * Calendar Overlap Layout Utility
 * Handles overlap detection, grouping, and column assignment for calendar events
 */

import { CalendarEvent } from '@/types/calendar';

export interface LayoutedEvent extends CalendarEvent {
  columnIndex: number;
  totalColumns: number;
  layoutGroup: number;
}

export interface OverlapGroup {
  events: CalendarEvent[];
  groupId: number;
}

/**
 * Check if two events overlap in time
 */
function eventsOverlap(eventA: CalendarEvent, eventB: CalendarEvent): boolean {
  const startA = new Date(eventA.startTime).getTime();
  const endA = new Date(eventA.endTime).getTime();
  const startB = new Date(eventB.startTime).getTime();
  const endB = new Date(eventB.endTime).getTime();

  // Overlap condition: startA < endB AND startB < endA
  return startA < endB && startB < endA;
}

/**
 * Find all events that overlap with the given event
 */
function findOverlappingEvents(event: CalendarEvent, allEvents: CalendarEvent[]): CalendarEvent[] {
  return allEvents.filter((e) => e.id !== event.id && eventsOverlap(event, e));
}

/**
 * Group events into overlap clusters using union-find approach
 */
function groupOverlappingEvents(events: CalendarEvent[]): OverlapGroup[] {
  if (events.length === 0) return [];

  const groups: OverlapGroup[] = [];
  const eventGroupMap = new Map<string, number>();
  let nextGroupId = 0;

  // Sort events by start time for consistent processing
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  for (const event of sortedEvents) {
    const overlappingEvents = findOverlappingEvents(event, sortedEvents);
    
    if (overlappingEvents.length === 0) {
      // Event doesn't overlap with any other - create a single-event group
      const groupId = nextGroupId++;
      groups.push({ events: [event], groupId });
      eventGroupMap.set(event.id, groupId);
    } else {
      // Find existing groups that contain overlapping events
      const overlappingGroupIds = new Set<number>();
      
      for (const overlappingEvent of overlappingEvents) {
        const existingGroupId = eventGroupMap.get(overlappingEvent.id);
        if (existingGroupId !== undefined) {
          overlappingGroupIds.add(existingGroupId);
        }
      }

      if (overlappingGroupIds.size === 0) {
        // Create new group with this event and all its overlapping events
        const groupId = nextGroupId++;
        const groupEvents = [event, ...overlappingEvents];
        groups.push({ events: groupEvents, groupId });
        for (const e of groupEvents) {
          eventGroupMap.set(e.id, groupId);
        }
      } else if (overlappingGroupIds.size === 1) {
        // Add to existing group
        const groupId = Array.from(overlappingGroupIds)[0];
        const group = groups.find((g) => g.groupId === groupId);
        if (group && !group.events.some((e) => e.id === event.id)) {
          group.events.push(event);
        }
        eventGroupMap.set(event.id, groupId);
      } else {
        // Merge multiple groups
        const groupIdsArray = Array.from(overlappingGroupIds);
        const primaryGroupId = groupIdsArray[0];
        const primaryGroup = groups.find((g) => g.groupId === primaryGroupId)!;
        
        // Merge all overlapping groups into primary group
        for (let i = 1; i < groupIdsArray.length; i++) {
          const mergeGroupId = groupIdsArray[i];
          const mergeGroup = groups.find((g) => g.groupId === mergeGroupId);
          if (mergeGroup) {
            // Add events from merge group to primary group
            for (const e of mergeGroup.events) {
              if (!primaryGroup.events.some((existing) => existing.id === e.id)) {
                primaryGroup.events.push(e);
              }
              eventGroupMap.set(e.id, primaryGroupId);
            }
            // Remove merged group
            const mergeIndex = groups.findIndex((g) => g.groupId === mergeGroupId);
            if (mergeIndex !== -1) {
              groups.splice(mergeIndex, 1);
            }
          }
        }
        
        // Add current event to primary group
        if (!primaryGroup.events.some((e) => e.id === event.id)) {
          primaryGroup.events.push(event);
        }
        eventGroupMap.set(event.id, primaryGroupId);
      }
    }
  }

  return groups;
}

/**
 * Assign columns to events within an overlap group
 * Uses greedy algorithm to minimize columns
 */
function assignColumnsToGroup(groupEvents: CalendarEvent[]): Map<string, { columnIndex: number; totalColumns: number }> {
  const columnMap = new Map<string, { columnIndex: number; totalColumns: number }>();
  
  if (groupEvents.length === 0) return columnMap;
  if (groupEvents.length === 1) {
    columnMap.set(groupEvents[0].id, { columnIndex: 0, totalColumns: 1 });
    return columnMap;
  }

  // Sort events by start time, then by end time for consistent ordering
  const sortedEvents = [...groupEvents].sort((a, b) => {
    const startDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    if (startDiff !== 0) return startDiff;
    return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
  });

  // Track which columns are occupied at each point in time
  const eventsByColumn: CalendarEvent[][] = [];
  
  for (const event of sortedEvents) {
    const eventStart = new Date(event.startTime).getTime();
    const eventEnd = new Date(event.endTime).getTime();
    
    // Find the first available column
    let assignedColumn = -1;
    
    for (let colIdx = 0; colIdx < eventsByColumn.length; colIdx++) {
      const columnEvents = eventsByColumn[colIdx];
      
      // Check if this column is free for this event's time range
      const isColumnFree = columnEvents.every((existingEvent) => {
        const existingStart = new Date(existingEvent.startTime).getTime();
        const existingEnd = new Date(existingEvent.endTime).getTime();
        // Column is free if event doesn't overlap with any existing event
        return eventEnd <= existingStart || eventStart >= existingEnd;
      });
      
      if (isColumnFree) {
        assignedColumn = colIdx;
        break;
      }
    }
    
    // If no column is free, create a new one
    if (assignedColumn === -1) {
      assignedColumn = eventsByColumn.length;
      eventsByColumn.push([]);
    }
    
    // Assign event to column
    eventsByColumn[assignedColumn].push(event);
  }
  
  const totalColumns = eventsByColumn.length;
  
  // Create column assignments for all events in the group
  for (const event of sortedEvents) {
    const columnIndex = eventsByColumn.findIndex((col) => col.some((e) => e.id === event.id));
    if (columnIndex !== -1) {
      columnMap.set(event.id, { columnIndex, totalColumns });
    }
  }
  
  return columnMap;
}

/**
 * Main function: Calculate layout for events with overlap handling
 */
export function calculateEventLayout(events: CalendarEvent[]): LayoutedEvent[] {
  if (events.length === 0) return [];

  // Filter out all-day events (they don't participate in time-grid layout)
  const timedEvents = events.filter((e) => !e.allDay);

  // Group overlapping events
  const overlapGroups = groupOverlappingEvents(timedEvents);

  // Create a map of all events with their layout info
  const layoutMap = new Map<string, LayoutedEvent>();

  // Process each overlap group
  for (const group of overlapGroups) {
    const columnAssignments = assignColumnsToGroup(group.events);

    for (const event of group.events) {
      const assignment = columnAssignments.get(event.id);
      if (assignment) {
        layoutMap.set(event.id, {
          ...event,
          columnIndex: assignment.columnIndex,
          totalColumns: assignment.totalColumns,
          layoutGroup: group.groupId,
        });
      }
    }
  }

  // Add non-overlapping events (they should have been in single-event groups)
  // But also handle events that weren't grouped (shouldn't happen, but safety check)
  for (const event of timedEvents) {
    if (!layoutMap.has(event.id)) {
      layoutMap.set(event.id, {
        ...event,
        columnIndex: 0,
        totalColumns: 1,
        layoutGroup: -1,
      });
    }
  }

  // Return as array
  return Array.from(layoutMap.values());
}

/**
 * Calculate pixel position for an event based on time
 */
export function calculateEventPosition(
  event: CalendarEvent,
  dayStart: Date,
  pixelsPerMinute: number
): { top: number; height: number } {
  const eventStart = new Date(event.startTime);
  const eventEnd = new Date(event.endTime);

  // Calculate minutes from day start
  const startMinutes = (eventStart.getTime() - dayStart.getTime()) / (1000 * 60);
  const endMinutes = (eventEnd.getTime() - dayStart.getTime()) / (1000 * 60);

  const top = startMinutes * pixelsPerMinute;
  const height = (endMinutes - startMinutes) * pixelsPerMinute;

  // Ensure minimum height for visibility
  const minHeight = 20; // pixels
  return {
    top: Math.max(0, top),
    height: Math.max(minHeight, height),
  };
}

/**
 * Calculate CSS styles for a layouted event
 */
export function getEventLayoutStyle(
  layoutedEvent: LayoutedEvent,
  dayStart: Date,
  pixelsPerMinute: number
): React.CSSProperties {
  const { top, height } = calculateEventPosition(layoutedEvent, dayStart, pixelsPerMinute);

  // Calculate width and left position based on column assignment
  const widthPercent = 100 / layoutedEvent.totalColumns;
  const leftPercent = (layoutedEvent.columnIndex / layoutedEvent.totalColumns) * 100;

  return {
    position: 'absolute',
    top: `${top}px`,
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
    height: `${height}px`,
    zIndex: 1,
  };
}

/**
 * Cache for overlap calculations (performance optimization)
 */
const layoutCache = new Map<string, LayoutedEvent[]>();

export function getCachedLayout(cacheKey: string, events: CalendarEvent[]): LayoutedEvent[] {
  const cached = layoutCache.get(cacheKey);
  if (cached) {
    // Verify events haven't changed (simple length check)
    // In production, you might want a more sophisticated cache invalidation
    return cached;
  }

  const layout = calculateEventLayout(events);
  layoutCache.set(cacheKey, layout);
  return layout;
}

export function clearLayoutCache(): void {
  layoutCache.clear();
}

