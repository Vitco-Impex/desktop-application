/**
 * Collapsible Section Component - Reusable collapsible section/accordion
 */

import React from 'react';
import './CollapsibleSection.css';

export interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
  className = '',
}) => {
  return (
    <div className={`collapsible-section ${className}`}>
      <button className="collapsible-section-header" onClick={onToggle}>
        <div className="collapsible-section-header-left">
          {icon && <span className="collapsible-section-icon">{icon}</span>}
          <h2 className="collapsible-section-title">{title}</h2>
        </div>
        <span className={`collapsible-section-toggle ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>
      {isExpanded && <div className="collapsible-section-content">{children}</div>}
    </div>
  );
};
