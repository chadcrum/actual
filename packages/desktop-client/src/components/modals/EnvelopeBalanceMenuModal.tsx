import React, { type CSSProperties } from 'react';
import { Trans } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  BalanceWithCarryover,
  CarryoverIndicator,
} from '@desktop-client/components/budget/BalanceWithCarryover';
import { BalanceMenu } from '@desktop-client/components/budget/envelope/BalanceMenu';
import { usePinnedCategories } from '@desktop-client/components/budget/hooks/usePinnedCategories';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '@desktop-client/components/common/Modal';
import { CellValueText } from '@desktop-client/components/spreadsheet/CellValue';
import { useCategory } from '@desktop-client/hooks/useCategory';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

type EnvelopeBalanceMenuModalProps = Omit<
  Extract<ModalType, { name: 'envelope-balance-menu' }>['options'],
  'month'
>;

export function EnvelopeBalanceMenuModal({
  categoryId,
  onCarryover,
  onTransfer,
  onCover,
}: EnvelopeBalanceMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  const category = useCategory(categoryId);
  const { isPinned, togglePin } = usePinnedCategories();
  const overviewEnabled = useFeatureFlag('enableOverviewPage');

  if (!category) {
    return null;
  }

  return (
    <Modal name="envelope-balance-menu">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={<ModalTitle title={category.name} shrinkOnOverflow />}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: 400,
              }}
            >
              <Trans>Balance</Trans>
            </Text>
            <BalanceWithCarryover
              isDisabled
              shouldInlineGoalStatus
              carryover={envelopeBudget.catCarryover(categoryId)}
              balance={envelopeBudget.catBalance(categoryId)}
              goal={envelopeBudget.catGoal(categoryId)}
              budgeted={envelopeBudget.catBudgeted(categoryId)}
              longGoal={envelopeBudget.catLongGoal(categoryId)}
              CarryoverIndicator={({ style }) => (
                <CarryoverIndicator
                  style={{
                    width: 15,
                    height: 15,
                    display: 'inline-flex',
                    position: 'relative',
                    ...style,
                  }}
                />
              )}
            >
              {props => (
                <CellValueText
                  {...props}
                  style={{
                    textAlign: 'center',
                    ...styles.veryLargeText,
                  }}
                />
              )}
            </BalanceWithCarryover>
          </View>
          <BalanceMenu
            categoryId={categoryId}
            getItemStyle={() => defaultMenuItemStyle}
            onCarryover={onCarryover}
            onTransfer={onTransfer}
            onCover={onCover}
          />
          {overviewEnabled && (
            <View
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px',
                borderTop: `1px solid ${theme.pillBorder}`,
                marginTop: '8px',
              }}
            >
              <input
                type="checkbox"
                id="pin-to-overview"
                checked={isPinned(categoryId)}
                onChange={() => togglePin(categoryId)}
                style={{
                  width: '18px',
                  height: '18px',
                  marginRight: '8px',
                  cursor: 'pointer',
                }}
              />
              <label
                htmlFor="pin-to-overview"
                style={{
                  fontSize: '14px',
                  color: theme.menuItemText,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <Trans>Pin to Overview</Trans>
              </label>
            </View>
          )}
        </>
      )}
    </Modal>
  );
}
