import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { triggerAction } from '../lib/actions';
import { useThemeStore } from '../store/useThemeStore';

export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: '⌘ Enter', label: 'Generate / apply' },
  { keys: 'G · E · M', label: 'Generate, Edit, Mask' },
  { keys: '[ ]', label: 'Brush smaller / larger' },
  { keys: 'X', label: 'Brush / eraser' },
  { keys: 'Z', label: 'Undo stroke' },
  { keys: 'C', label: 'Compare before / after' },
  { keys: 'D', label: 'Download' },
  { keys: 'H · P', label: 'Toggle history / composer' },
  { keys: 'T', label: 'Toggle theme' },
  { keys: '0', label: 'Fit to screen' },
];

export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        triggerAction('generate');
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      const s = useAppStore.getState();
      switch (event.key.toLowerCase()) {
        case 'g':
          s.setMode('generate');
          break;
        case 'e':
          s.setMode('edit');
          break;
        case 'm':
          s.setMode('mask');
          break;
        case 'h':
          s.setShowHistory(!s.showHistory);
          break;
        case 'p':
          s.setShowComposer(!s.showComposer);
          break;
        case 'c':
          if (s.canvasImage) s.setCompareMode(!s.compareMode);
          break;
        case 'd':
          triggerAction('download');
          break;
        case 't':
          useThemeStore.getState().toggle();
          break;
        case 'x':
          if (s.mode === 'mask') s.setBrushErase(!s.brushErase);
          break;
        case 'z':
          if (s.mode === 'mask') s.undoBrushStroke();
          break;
        case '[':
          s.setBrushSize(Math.max(4, s.brushSize - 6));
          break;
        case ']':
          s.setBrushSize(Math.min(200, s.brushSize + 6));
          break;
        case '0':
          s.resetView();
          break;
        case 'escape':
          if (s.compareMode) s.setCompareMode(false);
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
};
