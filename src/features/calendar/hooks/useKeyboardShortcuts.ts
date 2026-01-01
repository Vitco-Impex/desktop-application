/**
 * Keyboard Shortcuts Hook - Global keyboard shortcuts for calendar
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
  enabled?: boolean;
  description?: string;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcutConfig[],
  enabled: boolean = true
) {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Allow Escape to work even in inputs
        if (e.key === 'Escape') {
          // Find escape handler
          const escapeShortcut = shortcutsRef.current.find(
            (s) => s.key === 'Escape' && !s.ctrlKey && !s.shiftKey && !s.altKey
          );
          if (escapeShortcut && escapeShortcut.enabled !== false) {
            e.preventDefault();
            escapeShortcut.handler();
          }
        }
        return;
      }

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;

        const keyMatch = shortcut.key.toLowerCase() === e.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrlKey === e.ctrlKey || e.metaKey;
        const shiftMatch = !!shortcut.shiftKey === e.shiftKey;
        const altMatch = !!shortcut.altKey === e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);

  return useCallback((key: string) => {
    return shortcutsRef.current.find((s) => s.key === key)?.description || '';
  }, []);
}

/**
 * Calendar keyboard shortcuts configuration
 */
export const createCalendarShortcuts = (
  handlers: {
    onNewTask?: () => void;
    onCloseModal?: () => void;
    onNextDay?: () => void;
    onPreviousDay?: () => void;
    onNextWeek?: () => void;
    onPreviousWeek?: () => void;
    onDeleteSelected?: () => void;
    onFocusFilter?: () => void;
  }
): KeyboardShortcutConfig[] => {
  return [
    {
      key: 'n',
      handler: () => handlers.onNewTask?.(),
      description: 'Create new task',
      enabled: !!handlers.onNewTask,
    },
    {
      key: 'Escape',
      handler: () => handlers.onCloseModal?.(),
      description: 'Close modal/panel',
      enabled: !!handlers.onCloseModal,
    },
    {
      key: 'ArrowRight',
      handler: () => handlers.onNextDay?.(),
      description: 'Next day',
      enabled: !!handlers.onNextDay,
    },
    {
      key: 'ArrowLeft',
      handler: () => handlers.onPreviousDay?.(),
      description: 'Previous day',
      enabled: !!handlers.onPreviousDay,
    },
    {
      key: 'ArrowRight',
      ctrlKey: true,
      handler: () => handlers.onNextWeek?.(),
      description: 'Next week',
      enabled: !!handlers.onNextWeek,
    },
    {
      key: 'ArrowLeft',
      ctrlKey: true,
      handler: () => handlers.onPreviousWeek?.(),
      description: 'Previous week',
      enabled: !!handlers.onPreviousWeek,
    },
    {
      key: 'Delete',
      handler: () => handlers.onDeleteSelected?.(),
      description: 'Delete selected task',
      enabled: !!handlers.onDeleteSelected,
    },
    {
      key: 'f',
      ctrlKey: true,
      handler: () => handlers.onFocusFilter?.(),
      description: 'Focus filter panel',
      enabled: !!handlers.onFocusFilter,
    },
  ];
};

