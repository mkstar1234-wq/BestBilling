import { motion, PanInfo } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { hapticFeedback } from '../lib/haptics';
import { useState, ReactNode } from 'react';

interface SwipeableItemProps {
  onDelete: () => void | Promise<void>;
  children: ReactNode;
  key?: string | number;
}

export function SwipeableItem({ onDelete, children }: SwipeableItemProps) {
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // If swiped left past threshold
    if (info.offset.x < -80) {
      hapticFeedback('medium');
      onDelete();
    }
  };

  return (
    <div className="relative overflow-hidden bg-red-50 mb-2 rounded-xl border border-gray-100 shadow-sm">
      {/* Background Delete Action */}
      <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-end px-6 rounded-xl">
        <Trash2 className="text-white w-6 h-6" />
      </div>

      {/* Foreground Draggable Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.8, right: 0 }}
        onDragEnd={handleDragEnd}
        className="relative bg-white p-4 rounded-xl z-10 shadow-[2px_0_8px_rgba(0,0,0,0.05)] active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
}
