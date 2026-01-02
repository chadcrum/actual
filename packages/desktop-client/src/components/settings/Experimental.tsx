import { type ReactNode, useState } from 'react';
import { Trans } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { FeatureFlag, ServerPrefs } from 'loot-core/types/prefs';

import { Setting } from './UI';

import { useAuth } from '@desktop-client/auth/AuthProvider';
import { Permissions } from '@desktop-client/auth/types';
import { Link } from '@desktop-client/components/common/Link';
import { Checkbox } from '@desktop-client/components/forms';
import {
  useLoginMethod,
  useMultiuserEnabled,
} from '@desktop-client/components/ServerContext';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useServerPref } from '@desktop-client/hooks/useServerPref';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useSyncServerStatus } from '@desktop-client/hooks/useSyncServerStatus';

type FeatureToggleProps = {
  flag: FeatureFlag;
  disableToggle?: boolean;
  error?: ReactNode;
  children: ReactNode;
  feedbackLink?: string;
};

function FeatureToggle({
  flag: flagName,
  disableToggle = false,
  feedbackLink,
  error,
  children,
}: FeatureToggleProps) {
  const enabled = useFeatureFlag(flagName);
  const [_, setFlagPref] = useSyncedPref(`flags.${flagName}`);

  return (
    <label style={{ display: 'flex' }}>
      <Checkbox
        checked={enabled}
        onChange={() => {
          setFlagPref(String(!enabled));
        }}
        disabled={disableToggle}
      />
      <View
        style={{ color: disableToggle ? theme.pageTextSubdued : 'inherit' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {children}
          {feedbackLink && (
            <Link variant="external" to={feedbackLink}>
              <Trans>(give feedback)</Trans>
            </Link>
          )}
        </View>

        {disableToggle && (
          <Text
            style={{
              color: theme.errorText,
              fontWeight: 500,
            }}
          >
            {error}
          </Text>
        )}
      </View>
    </label>
  );
}

type ServerFeatureToggleProps = {
  prefName: keyof ServerPrefs;
  disableToggle?: boolean;
  error?: ReactNode;
  children: ReactNode;
  feedbackLink?: string;
};

function ServerFeatureToggle({
  prefName,
  disableToggle = false,
  feedbackLink,
  error,
  children,
}: ServerFeatureToggleProps) {
  const [enabled, setEnabled] = useServerPref(prefName);

  const syncServerStatus = useSyncServerStatus();
  const isUsingServer = syncServerStatus !== 'no-server';
  const isServerOffline = syncServerStatus === 'offline';
  const { hasPermission } = useAuth();
  const loginMethod = useLoginMethod();
  const multiuserEnabled = useMultiuserEnabled();

  if (!isUsingServer || isServerOffline) {
    return null;
  }

  // Show to admins if OIDC is enabled, or to everyone if multi-user is not enabled
  const isAdmin = hasPermission(Permissions.ADMINISTRATOR);
  const oidcEnabled = loginMethod === 'openid';
  const shouldShow = (oidcEnabled && isAdmin) || !multiuserEnabled;

  if (!shouldShow) {
    return null;
  }

  return (
    <label style={{ display: 'flex' }}>
      <Checkbox
        checked={enabled === 'true'}
        onChange={() => {
          setEnabled(enabled === 'true' ? 'false' : 'true');
        }}
        disabled={disableToggle}
      />
      <View
        style={{ color: disableToggle ? theme.pageTextSubdued : 'inherit' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {children}
          {feedbackLink && (
            <Link variant="external" to={feedbackLink}>
              <Trans>(give feedback)</Trans>
            </Link>
          )}
        </View>

        {disableToggle && (
          <Text
            style={{
              color: theme.errorText,
              fontWeight: 500,
            }}
          >
            {error}
          </Text>
        )}
      </View>
    </label>
  );
}

export function ExperimentalFeatures() {
  const [expanded, setExpanded] = useState(false);
  const [fontSize, setFontSize] = useSyncedPref('mobileBudgetTableFontSize');
  const increaseMobileBudgetTableFontSizeEnabled = useFeatureFlag(
    'increaseMobileBudgetTableFontSize',
  );

  const goalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const goalTemplatesUIEnabled = useFeatureFlag('goalTemplatesUIEnabled');
  const showGoalTemplatesUI =
    goalTemplatesUIEnabled ||
    (goalTemplatesEnabled &&
      localStorage.getItem('devEnableGoalTemplatesUI') === 'true');

  const showServerPrefs =
    localStorage.getItem('devEnableServerPrefs') === 'true';

  return (
    <Setting
      primaryAction={
        expanded ? (
          <View style={{ gap: '1em' }}>
            <FeatureToggle flag="goalTemplatesEnabled">
              <Trans>Goal templates</Trans>
            </FeatureToggle>
            {showGoalTemplatesUI && (
              <View style={{ paddingLeft: 22 }}>
                <FeatureToggle flag="goalTemplatesUIEnabled">
                  <Trans>Subfeature: Budget automations UI</Trans>
                </FeatureToggle>
              </View>
            )}
            <FeatureToggle
              flag="actionTemplating"
              feedbackLink="https://github.com/actualbudget/actual/issues/3606"
            >
              <Trans>Rule action templating</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="formulaMode"
              feedbackLink="https://github.com/actualbudget/actual/issues/5949"
            >
              <Trans>Excel formula mode (Formula cards & Rule formulas)</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="currency"
              feedbackLink="https://github.com/actualbudget/actual/issues/5191"
            >
              <Trans>Currency support</Trans>
            </FeatureToggle>

            <FeatureToggle
              flag="crossoverReport"
              feedbackLink="https://github.com/actualbudget/actual/issues/6134"
            >
              <Trans>Crossover Report</Trans>
            </FeatureToggle>
            <FeatureToggle flag="forceReload">
              <Trans>Force reload app button</Trans>
            </FeatureToggle>
            <FeatureToggle flag="increaseMobileBudgetTableFontSize">
              <Trans>Increase mobile budget table font size</Trans>
            </FeatureToggle>
            {increaseMobileBudgetTableFontSizeEnabled && (
              <View style={{ paddingLeft: 22, marginTop: 8 }}>
                <View style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text>
                    <Trans>Font size:</Trans>
                  </Text>
                  <Select
                    value={fontSize || '14'}
                    onChange={value => setFontSize(value)}
                    options={[
                      ['12', '12px'],
                      ['13', '13px'],
                      ['14', '14px'],
                      ['15', '15px'],
                      ['16', '16px'],
                      ['17', '17px'],
                      ['18', '18px'],
                      ['19', '19px'],
                      ['20', '20px'],
                    ]}
                    style={{ width: 80 }}
                  />
                </View>
              </View>
            )}
            <FeatureToggle flag="enableOverviewPage">
              <Trans>Mobile overview page</Trans>
            </FeatureToggle>
            <FeatureToggle flag="mobileParity">
              <Trans>Mobile parity features</Trans>
            </FeatureToggle>
            {showServerPrefs && (
              <ServerFeatureToggle
                prefName="flags.plugins"
                disableToggle
                feedbackLink="https://github.com/actualbudget/actual/issues/5950"
              >
                <Trans>Client-Side plugins (soon)</Trans>
              </ServerFeatureToggle>
            )}
          </View>
        ) : (
          <Link
            variant="text"
            onClick={() => setExpanded(true)}
            data-testid="experimental-settings"
            style={{
              flexShrink: 0,
              alignSelf: 'flex-start',
              color: theme.pageTextPositive,
            }}
          >
            <Trans>I understand the risks, show experimental features</Trans>
          </Link>
        )
      }
    >
      <Text>
        <Trans>
          <strong>Experimental features.</strong> These features are not fully
          tested and may not work as expected. THEY MAY CAUSE IRRECOVERABLE DATA
          LOSS. They may do nothing at all. Only enable them if you know what
          you are doing.
        </Trans>
      </Text>
    </Setting>
  );
}
