import { renderHook, act } from '@testing-library/react';
import { useTableSelection } from '../useTableSelection';

const rows = [
  { id: 'a' },
  { id: 'b' },
  { id: 'c' },
];

describe('useTableSelection', () => {
  it('starts with an empty selection', () => {
    const { result } = renderHook(() => useTableSelection(rows));

    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.allSelected).toBe(false);
    expect(result.current.someSelected).toBe(false);
    expect(result.current.isSelected('a')).toBe(false);
  });

  it('toggle adds then removes an id', () => {
    const { result } = renderHook(() => useTableSelection(rows));

    act(() => result.current.toggle('a'));
    expect(result.current.selectedIds).toEqual(['a']);
    expect(result.current.isSelected('a')).toBe(true);
    expect(result.current.someSelected).toBe(true);
    expect(result.current.allSelected).toBe(false);

    act(() => result.current.toggle('a'));
    expect(result.current.selectedIds).toEqual([]);
  });

  it('toggleAll selects every visible row', () => {
    const { result } = renderHook(() => useTableSelection(rows));

    act(() => result.current.toggleAll());
    expect(result.current.selectedIds.sort()).toEqual(['a', 'b', 'c']);
    expect(result.current.allSelected).toBe(true);
  });

  it('toggleAll clears selection when all visible rows are already selected', () => {
    const { result } = renderHook(() => useTableSelection(rows));

    act(() => result.current.toggleAll());
    act(() => result.current.toggleAll());
    expect(result.current.selectedIds).toEqual([]);
  });

  it('clear empties the selection', () => {
    const { result } = renderHook(() => useTableSelection(rows));

    act(() => {
      result.current.toggle('a');
      result.current.toggle('b');
    });
    act(() => result.current.clear());
    expect(result.current.selectedIds).toEqual([]);
  });

  it('ignores ids not in the current visible rows when computing allSelected', () => {
    const { result, rerender } = renderHook(({ data }) => useTableSelection(data), {
      initialProps: { data: rows },
    });

    act(() => {
      result.current.toggle('a');
      result.current.toggle('b');
      result.current.toggle('c');
    });

    // Now shrink the visible rows: the selection list may still hold removed ids
    // because we don't mutate it on every rerender, but allSelected must reflect
    // only the currently-visible rows.
    rerender({ data: [{ id: 'a' }, { id: 'b' }] });
    expect(result.current.allSelected).toBe(true);
  });

  it('returns ids stable across renders when inputs do not change', () => {
    const { result, rerender } = renderHook(() => useTableSelection(rows));
    const first = result.current.selectedIds;
    rerender();
    expect(result.current.selectedIds).toBe(first);
  });
});
