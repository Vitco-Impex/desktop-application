/**
 * Mouse Tooltip Component - Follows mouse cursor
 * For calendar views and other mouse-following tooltip needs
 */

import React, { useEffect, useState } from 'react';
import './MouseTooltip.css';

export interface MouseTooltipProps {
  visible: boolean;
  content: React.ReactNode;
  x?: number;
  y?: number;
}

export const MouseTooltip: React.FC<MouseTooltipProps> = ({ visible, content, x, y }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!visible) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [visible]);

  if (!visible) return null;

  const displayX = x !== undefined ? x : position.x;
  const displayY = y !== undefined ? y : position.y;

  return (
    <div
      className="mouse-tooltip"
      style={{
        left: displayX + 12,
        top: displayY + 12,
      }}
    >
      {content}
    </div>
  );
};
