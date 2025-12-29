import { useCallback } from 'react';

import { type SyncedPrefs } from 'loot-core/types/prefs';

import { saveSyncedPrefs } from '@desktop-client/prefs/prefsSlice';
import { useSelector, useDispatch } from '@desktop-client/redux';

type SetSyncedPrefAction<K extends keyof SyncedPrefs> = (
  value: SyncedPrefs[K],
) => void;

export function useSyncedPref<K extends keyof SyncedPrefs>(
  prefName: K,
  defaultValue?: SyncedPrefs[K] | { ids: string[]; order: string[] },
): any {
  const dispatch = useDispatch();
  const setPref = useCallback<any>(
    (value: any) => {
      dispatch(
        saveSyncedPrefs({
          prefs: { [prefName]: value },
        }),
      );
    },
    [prefName, dispatch],
  );
  const pref = useSelector(state => state.prefs.synced[prefName]);

  return [pref ?? defaultValue, setPref];
}
