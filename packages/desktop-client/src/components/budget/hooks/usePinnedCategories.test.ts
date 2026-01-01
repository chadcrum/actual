import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';

import { usePinnedCategories } from './usePinnedCategories';

import { useCategories } from '@desktop-client/hooks/useCategories';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

vi.mock('../../../hooks/useSyncedPref');
vi.mock('../../../hooks/useCategories');

describe('usePinnedCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns empty array when no categories pinned', () => {
    // @ts-ignore - Mock type compatibility
    vi.mocked(useSyncedPref).mockReturnValue([undefined, vi.fn()]);
    // @ts-ignore - Mock type compatibility
    vi.mocked(useCategories).mockReturnValue({ list: [], grouped: [] });

    const { result } = renderHook(() => usePinnedCategories());

    expect(result.current.pinnedCategoryIds).toEqual([]);
  });

  test('deserializes and returns pinned category IDs', () => {
    const categoryIds = ['cat-1', 'cat-2'];
    // @ts-ignore - Mock type compatibility
    vi.mocked(useSyncedPref).mockReturnValue([
      JSON.stringify(categoryIds),
      vi.fn(),
    ]);
    // @ts-ignore - Mock type compatibility
    vi.mocked(useCategories).mockReturnValue({ list: [], grouped: [] });

    const { result } = renderHook(() => usePinnedCategories());

    expect(result.current.pinnedCategoryIds).toEqual(categoryIds);
  });

  test('isPinned returns true for pinned category', () => {
    // @ts-ignore - Mock type compatibility
    vi.mocked(useSyncedPref).mockReturnValue([
      JSON.stringify(['cat-1', 'cat-2']),
      vi.fn(),
    ]);
    // @ts-ignore - Mock type compatibility
    vi.mocked(useCategories).mockReturnValue({ list: [], grouped: [] });

    const { result } = renderHook(() => usePinnedCategories());

    expect(result.current.isPinned('cat-1')).toBe(true);
    expect(result.current.isPinned('cat-3')).toBe(false);
  });

  test('togglePin adds category to pinned list', () => {
    const mockSavePref = vi.fn();
    // @ts-ignore - Mock type compatibility
    vi.mocked(useSyncedPref).mockReturnValue([
      JSON.stringify(['cat-1']),
      mockSavePref,
    ]);
    // @ts-ignore - Mock type compatibility
    vi.mocked(useCategories).mockReturnValue({ list: [], grouped: [] });

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
    // @ts-ignore - Mock type compatibility
    vi.mocked(useSyncedPref).mockReturnValue([
      JSON.stringify(['cat-1', 'cat-2']),
      mockSavePref,
    ]);
    // @ts-ignore - Mock type compatibility
    vi.mocked(useCategories).mockReturnValue({ list: [], grouped: [] });

    const { result } = renderHook(() => usePinnedCategories());

    act(() => {
      result.current.togglePin('cat-1');
    });

    expect(mockSavePref).toHaveBeenCalledWith(JSON.stringify(['cat-2']));
  });

  test('togglePin does nothing with empty categoryId', () => {
    const mockSavePref = vi.fn();
    // @ts-ignore - Mock type compatibility
    vi.mocked(useSyncedPref).mockReturnValue([
      JSON.stringify(['cat-1']),
      mockSavePref,
    ]);
    // @ts-ignore - Mock type compatibility
    vi.mocked(useCategories).mockReturnValue({ list: [], grouped: [] });

    const { result } = renderHook(() => usePinnedCategories());

    act(() => {
      result.current.togglePin('');
    });

    expect(mockSavePref).not.toHaveBeenCalled();
  });

  test('getPinnedCategories returns category objects in budget order', () => {
    const mockCategoryList = [
      { id: 'cat-1', name: 'Groceries', group: 'group-1' },
      { id: 'cat-2', name: 'Utilities', group: 'group-1' },
      { id: 'cat-3', name: 'Entertainment', group: 'group-1' },
    ];

    // @ts-ignore - Mock type compatibility
    vi.mocked(useSyncedPref).mockReturnValue([
      JSON.stringify(['cat-2', 'cat-1']),
      vi.fn(),
    ]);
    // @ts-ignore - Mock type compatibility
    vi.mocked(useCategories).mockReturnValue({
      list: mockCategoryList,
      grouped: [],
    });

    const { result } = renderHook(() => usePinnedCategories());
    const pinned = result.current.getPinnedCategories();

    expect(pinned).toHaveLength(2);
    // Even though pinnedCategoryIds is ['cat-2', 'cat-1'], the result
    // should be in budget page order (cat-1, cat-2) as they appear in categoryList
    expect(pinned[0].id).toBe('cat-1');
    expect(pinned[1].id).toBe('cat-2');
  });
});
