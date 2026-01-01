/**
 * Section Wrapper - Reusable collapsible section component
 */

import React from 'react';
import './SectionWrapper.css';

interface SectionWrapperProps {
  title: string;
  icon?: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}) => {
  return (
    <div className="section-wrapper">
      <button className="section-header" onClick={onToggle}>
        <div className="section-header-left">
          {icon && <span className="section-icon">{icon}</span>}
          <h2 className="section-title">{title}</h2>
        </div>
        <span className={`section-toggle ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>
      {isExpanded && <div className="section-content">{children}</div>}
    </div>
  );
};

