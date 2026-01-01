import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { useCategories } from '../../../hooks/useCategories';
import { usePinnedCategories } from './usePinnedCategories';

vi.mock('../../../hooks/useSyncedPref');
vi.mock('../../../hooks/useCategories');

describe('usePinnedCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns empty array when no categories pinned', () => {
    (useSyncedPref as any).mockReturnValue([undefined, vi.fn()]);
    (useCategories as any).mockReturnValue({ list: [], grouped: [] });

    const { result } = renderHook(() => usePinnedCategories());

    expect(result.current.pinnedCategoryIds).toEqual([]);
  });

  test('deserializes and returns pinned category IDs', () => {
    const categoryIds = ['cat-1', 'cat-2'];
    (useSyncedPref as any).mockReturnValue([
      JSON.stringify(categoryIds),
      vi.fn(),
    ]);
    (useCategories as any).mockReturnValue({ list: [], grouped: [] });

    const { result } = renderHook(() => usePinnedCategories());

    expect(result.current.pinnedCategoryIds).toEqual(categoryIds);
  });

  test('isPinned returns true for pinned category', () => {
    (useSyncedPref as any).mockReturnValue([
      JSON.stringify(['cat-1', 'cat-2']),
      vi.fn(),
    ]);
    (useCategories as any).mockReturnValue({ list: [], grouped: [] });

    const { result } = renderHook(() => usePinnedCategories());

    expect(result.current.isPinned('cat-1')).toBe(true);
    expect(result.current.isPinned('cat-3')).toBe(false);
  });

  test('togglePin adds category to pinned list', () => {
    const mockSavePref = vi.fn();
    (useSyncedPref as any).mockReturnValue([
      JSON.stringify(['cat-1']),
      mockSavePref,
    ]);
    (useCategories as any).mockReturnValue({ list: [], grouped: [] });

    const { result } = renderHook(() => usePinnedCategories());

    act(() => {
      result.current.togglePin('cat-2');
    });

    expect(mockSavePref).toHaveBeenCalledWith(
      JSON.stringify(['cat-1', 'cat-2']),
    );
  });

  test('togglePin removes category from pinned list', () => {
    const mockSavePref = vi.fn();
    (useSyncedPref as any).mockReturnValue([
      JSON.stringify(['cat-1', 'cat-2']),
      mockSavePref,
    ]);
    (useCategories as any).mockReturnValue({ list: [], grouped: [] });

    const { result } = renderHook(() => usePinnedCategories());

    act(() => {
      result.current.togglePin('cat-1');
    });

    expect(mockSavePref).toHaveBeenCalledWith(JSON.stringify(['cat-2']));
  });

  test('getPinnedCategories returns category objects in budget order', () => {
    const mockCategoryList = [
      { id: 'cat-1', name: 'Groceries' },
      { id: 'cat-2', name: 'Utilities' },
      { id: 'cat-3', name: 'Entertainment' },
    ];

    (useSyncedPref as any).mockReturnValue([
      JSON.stringify(['cat-2', 'cat-1']),
      vi.fn(),
    ]);
    (useCategories as any).mockReturnValue({
      list: mockCategoryList,
      grouped: [],
    });

    const { result } = renderHook(() => usePinnedCategories());
    const pinned = result.current.getPinnedCategories();

    expect(pinned).toHaveLength(2);
    expect(pinned[0].id).toBe('cat-2');
    expect(pinned[1].id).toBe('cat-1');
  });
});
