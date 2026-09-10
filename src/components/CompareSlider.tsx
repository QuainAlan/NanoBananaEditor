import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './ui/Button';

interface CompareSliderProps {
  before: string;
  after: string;
  onClose: () => void;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({ before, after, onClose }) => {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const update = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-4 animate-fade-in">
      <div
        ref={ref}
        className="relative max-h-full max-w-full select-none overflow-hidden rounded-xl border border-line shadow-pop"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          update(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && update(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => (dragging.current = false)}
        style={{ cursor: 'ew-resize' }}
      >
        <img src={after} alt="After" className="block max-h-[calc(100vh-10rem)] max-w-full" draggable={false} />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img src={before} alt="Before" className="block h-full w-full object-cover" draggable={false} />
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.4)]" style={{ left: `${pos}%` }}>
          <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black shadow-pop">
            ⇔
          </div>
        </div>
        <span className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">Before</span>
        <span className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">After</span>
      </div>
      <IconButton label="Close compare (Esc)" onClick={onClose} className="absolute right-4 top-4 bg-surface shadow-soft">
        <X className="h-4 w-4" />
      </IconButton>
    </div>
  );
};
