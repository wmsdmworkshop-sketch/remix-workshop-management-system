import { useEffect } from 'react';

export function useEscapeKey(callback: () => void, isModalOpen: boolean) {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        callback();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [callback, isModalOpen]);
}
