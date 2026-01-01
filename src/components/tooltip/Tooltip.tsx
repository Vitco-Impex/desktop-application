import React, { useEffect, useState } from 'react';

interface TooltipProps {
  visible: boolean;
  content: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ visible, content }) => {
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

  return (
    <div
      className="
        fixed z-[9999]
        pointer-events-none
        bg-gray-900 text-white
        text-xs
        px-3 py-1.5
        rounded-md
        shadow-lg
        whitespace-nowrap
        transition-opacity duration-100
      "
      style={{
        left: position.x + 12,
        top: position.y + 12,
      }}
    >
      {content}
    </div>
  );
};
