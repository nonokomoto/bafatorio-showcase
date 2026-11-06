import { useCallback, useMemo, useState } from 'react';

/**
 * Generic multi-select helper for tables. Mirrors the participant table's
 * selection behaviour so Supplier / EventSupplier / future tables can share
 * the same surface: { selectedIds, isSelected, toggle, toggleAll, clear,
 * allSelected, someSelected, selectedCount }.
 *
 * `rows` is treated as the "currently visible" set — toggleAll and
 * allSelected operate on these ids, not on the raw state. This is
 * deliberate so that filtering or pagination in the parent doesn't
 * surprise the user by flipping "select all" semantics.
 *
 * @param {Array<{ id: string }>} rows
 * @param {{ getId?: (row: any) => string }} [options]
 */
export function useTableSelection(rows, options = {}) {
  const userGetId = options.getId;
  const getId = useMemo(() => userGetId || ((row) => row?.id), [userGetId]);
  const [selectedIds, setSelectedIds] = useState([]);

  const visibleIds = useMemo(() => (rows || []).map(getId).filter(Boolean), [rows, getId]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const isSelected = useCallback((id) => selectedSet.has(id), [selectedSet]);

  const toggle = useCallback((id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allPresent = visibleIds.length > 0 && visibleIds.every((id) => prev.includes(id));
      if (allPresent) {
        // Remove only the visible ids, keep others (e.g. previously selected on other pages).
        return prev.filter((id) => !visibleIds.includes(id));
      }
      const merged = new Set(prev);
      visibleIds.forEach((id) => merged.add(id));
      return Array.from(merged);
    });
  }, [visibleIds]);

  const clear = useCallback(() => setSelectedIds([]), []);

  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const someSelected = visibleIds.some((id) => selectedSet.has(id)) && !allSelected;

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    isSelected,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  };
}

export default useTableSelection;
