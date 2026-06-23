import { useState, useCallback } from "react";

/**
 * useImageDrop(onFile) — drag-and-drop image support for an upload zone.
 *
 * Returns { drag, dropProps }: spread `dropProps` on the drop target, and use `drag`
 * to highlight its dashed border while a file hovers. The dropped File is handed to
 * the same `onFile` callback the click-to-pick file input uses, so behaviour is identical.
 */
export function useImageDrop(onFile, { accept = "image/" } = {}) {
  const [drag, setDrag] = useState(false);

  const onDragOver  = useCallback((e) => { e.preventDefault(); setDrag(true); }, []);
  const onDragLeave = useCallback((e) => { e.preventDefault(); setDrag(false); }, []);
  const onDrop      = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer?.files?.[0];
    if (f && (!accept || f.type.startsWith(accept))) onFile?.(f);
  }, [onFile, accept]);

  return { drag, dropProps: { onDragOver, onDragLeave, onDrop } };
}
