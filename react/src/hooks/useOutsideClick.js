import { useEffect } from 'react';

// refs: a single ref or an array of refs
export default function useOutsideClick(refs, handler) {
  useEffect(() => {
    function onDocClick(e) {
      try {
        const target = e.target;
        const refArray = Array.isArray(refs) ? refs : [refs];
        // if any ref contains the target, do nothing
        for (const r of refArray) {
          if (!r || !r.current) continue;
          if (r.current.contains(target)) return;
        }
        handler?.(e);
      } catch (err) {
        // ignore
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [refs, handler]);
}
