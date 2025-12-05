import { useEffect, useState, useMemo } from 'react';

import { send } from 'loot-core/platform/client/fetch';

import { useCategories } from './useCategories';

type TemplateAmounts = Record<string, number>;

const cache = new Map<string, TemplateAmounts>();

export function useTemplateAmounts(
  month: string,
  enabled: boolean = true,
): {
  amounts: TemplateAmounts | null;
  isLoading: boolean;
} {
  const { list: categories } = useCategories();
  const [amounts, setAmounts] = useState<TemplateAmounts | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const categoryIds = useMemo(() => categories.map(c => c.id), [categories]);

  const cacheKey = `${month}-all`;

  useEffect(() => {
    if (!enabled) {
      setAmounts(null);
      return;
    }

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      setAmounts(cached);
      return;
    }

    // Fetch if not cached
    setIsLoading(true);
    send('budget/get-template-amounts', {
      month,
      categoryIds: undefined, // Get all categories
    })
      .then(result => {
        cache.set(cacheKey, result);
        setAmounts(result);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [month, enabled, cacheKey]);

  return { amounts, isLoading };
}

export async function fetchTemplateAmounts(
  month: string,
  categoryIds?: string[],
): Promise<TemplateAmounts> {
  const cacheKey = categoryIds
    ? `${month}-${categoryIds.join(',')}`
    : `${month}-all`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const amounts = await send('budget/get-template-amounts', {
    month,
    categoryIds,
  });

  cache.set(cacheKey, amounts);
  return amounts;
}
