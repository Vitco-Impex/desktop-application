/**
 * DropdownMenu Component - Kebab menu for row actions
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './DropdownMenu.css';

export interface DropdownMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Calculate menu position
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 200;
      const viewportWidth = window.innerWidth;
      
      let left = rect.left;
      if (align === 'right') {
        left = rect.right - menuWidth;
      }
      
      if (left + menuWidth > viewportWidth - 10) {
        left = viewportWidth - menuWidth - 10;
      }
      if (left < 10) {
        left = 10;
      }

      setPosition({
        top: rect.bottom + 4,
        left,
      });
    }
  }, [isOpen, align]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        setIsOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const enabledItems = items.filter(item => !item.disabled && !item.divider);
        setFocusedIndex((prev) => {
          const next = prev < enabledItems.length - 1 ? prev + 1 : 0;
          return next;
        });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const enabledItems = items.filter(item => !item.disabled && !item.divider);
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : enabledItems.length - 1;
          return next;
        });
        return;
      }

      if (event.key === 'Enter' && focusedIndex >= 0) {
        event.preventDefault();
        const enabledItems = items.filter(item => !item.disabled && !item.divider);
        const item = enabledItems[focusedIndex];
        if (item) {
          item.onClick();
          setIsOpen(false);
          setFocusedIndex(-1);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, items, focusedIndex]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    setFocusedIndex(-1);
  };

  const handleItemClick = (item: DropdownMenuItem) => {
    if (item.disabled || item.divider) return;
    item.onClick();
    setIsOpen(false);
    setFocusedIndex(-1);
  };

  const enabledItems = items.filter(item => !item.disabled && !item.divider);
  let currentFocusedItemIndex = -1;
  if (focusedIndex >= 0) {
    let count = 0;
    for (let i = 0; i < items.length; i++) {
      if (!items[i].disabled && !items[i].divider) {
        if (count === focusedIndex) {
          currentFocusedItemIndex = i;
          break;
        }
        count++;
      }
    }
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={`dropdown-menu-trigger ${className}`}
        onClick={handleTriggerClick}
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>
      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          className="dropdown-menu"
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 1060,
          }}
          role="menu"
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={item.id} className="dropdown-menu-divider" />;
            }

            const isFocused = index === currentFocusedItemIndex;

            return (
              <button
                key={item.id}
                className={`dropdown-menu-item ${item.danger ? 'dropdown-menu-item--danger' : ''} ${item.disabled ? 'dropdown-menu-item--disabled' : ''} ${isFocused ? 'dropdown-menu-item--focused' : ''}`}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                role="menuitem"
              >
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};
