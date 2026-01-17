/**
 * Date/Time Formatting Utilities
 * Centralized date formatting functions to avoid duplication
 */

export type DateFormatOptions = {
  includeTime?: boolean;
  includeSeconds?: boolean;
  format?: 'short' | 'medium' | 'long' | 'full';
};

/**
 * Format date string to localized date string
 */
export function formatDate(
  dateString: string | Date | null | undefined,
  options: DateFormatOptions = {}
): string {
  if (!dateString) return '—';

  try {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return '—';
    }

    const { includeTime = false, includeSeconds = false, format = 'medium' } = options;

    if (includeTime) {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: format === 'short' ? 'numeric' : 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...(includeSeconds && { second: '2-digit' }),
      });
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: format === 'short' ? 'numeric' : format === 'long' ? 'long' : 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format time string (HH:mm format) to readable time
 */
export function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return '—';

  try {
    // Handle ISO string format
    if (timeString.includes('T') || timeString.includes('Z')) {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    // Handle HH:mm format
    const [hours, minutes] = timeString.split(':');
    if (!hours || !minutes) return '—';

    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Format date range
 */
export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  
  if (start === '—' && end === '—') return '—';
  if (start === '—') return `Until ${end}`;
  if (end === '—') return `From ${start}`;
  
  return `${start} - ${end}`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string | Date): string {
  const date = dateString instanceof Date ? dateString : new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(date);
}
