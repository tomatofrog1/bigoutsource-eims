import React, { useState, useRef } from 'react';
import { cn } from '@/src/lib/utils';

interface ResizableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  columnKey: string;
  initialWidth?: number | string;
  minWidth?: number;
  onResize: (key: string, width: number) => void;
  children: React.ReactNode;
}

export function ResizableHeader({
  columnKey,
  initialWidth,
  minWidth = 50,
  onResize,
  children,
  className,
  ...props
}: ResizableHeaderProps) {
  const thRef = useRef<HTMLTableCellElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = thRef.current?.getBoundingClientRect().width || 0;

    const doDrag = (dragEvent: MouseEvent) => {
      // Calculate new width
      const newWidth = Math.max(minWidth, startWidth + dragEvent.clientX - startX);
      onResize(columnKey, newWidth);
    };

    const stopDrag = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  return (
    <th ref={thRef} data-col-key={columnKey} className={cn('relative group/th', className)} style={{ width: initialWidth }} {...props}>
      {children}
      <div
        onMouseDown={startResize}
        onClick={(e) => e.stopPropagation()} // Prevent sort trigger when clicking the resizer
        className="absolute right-0 top-0 bottom-0 w-[12px] translate-x-1/2 flex items-center justify-center cursor-col-resize group/resizer z-10"
        title="Drag to resize column"
      >
        <div className={cn(
          "h-1/2 w-[2px] rounded-full bg-gray-300 opacity-0 group-hover/th:opacity-100 group-hover/resizer:bg-[#111827] transition-all",
          isResizing && "bg-[#111827] opacity-100"
        )} />
      </div>
    </th>
  );
}
