import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';


function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
    || target.isContentEditable
  );
}


export function GlobalUndoRedoShortcuts() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const busyRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const primaryModifier = event.metaKey || event.ctrlKey;
      const isUndo = primaryModifier && !event.altKey && !event.shiftKey && key === 'z';
      const isRedo = (
        primaryModifier
        && !event.altKey
        && event.shiftKey
        && key === 'z'
      ) || (
        event.ctrlKey
        && !event.metaKey
        && !event.altKey
        && !event.shiftKey
        && key === 'y'
      );

      if (!isUndo && !isRedo) return;
      event.preventDefault();
      if (busyRef.current) return;
      busyRef.current = true;

      void (async () => {
        try {
          const result = isRedo
            ? await api.redoLastAction()
            : await api.undoLastAction();

          showToast(result.message, result.changed ? 'success' : 'info');
          if (result.changed) {
            await queryClient.invalidateQueries();
          }
        } catch (error) {
          showToast(
            error instanceof Error
              ? error.message
              : isRedo
                ? 'Redo failed'
                : 'Undo failed',
            'error',
          );
        } finally {
          busyRef.current = false;
        }
      })();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [queryClient, showToast]);

  return null;
}
