/**
 * SideDrawer Component - Slide-in drawer from right
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './SideDrawer.css';

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: string;
  className?: string;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = '480px',
  className = '',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="side-drawer-overlay" onClick={onClose}>
      <div
        className={`side-drawer ${className}`}
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="side-drawer-header">
            <h2 className="side-drawer-title">{title}</h2>
            <button
              className="side-drawer-close"
              onClick={onClose}
              aria-label="Close drawer"
            >
              ×
            </button>
          </div>
        )}
        <div className="side-drawer-content">{children}</div>
      </div>
    </div>,
    document.body
  );
};
