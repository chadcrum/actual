# Add Data to Budget Modal

## Goal Description
The user wants to add additional data to the "budget modal" which appears on desktop hover and mobile selection. Specifically, a horizontal line and the word "test" above the current text.

## User Review Required
None.

## Proposed Changes

### Desktop Client

#### [MODIFY] [TotalsList.tsx](file:///home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/TotalsList.tsx)
- Wrap the existing content in a container `View`.
- Insert a new `View` or `Block` at the top with the text "test".
- Insert a horizontal line (e.g., `<View style={{ borderBottom: '1px solid ' + theme.tableBorder, margin: '5px 0' }} />`).
- Ensure the layout remains consistent (the existing content is a row of values and labels).

## Verification Plan

### Manual Verification
1.  **Desktop**:
    -   Navigate to the Budget page.
    -   Hover over the "To Budget" (or "Overbudgeted") amount at the top of the budget month column.
    -   Verify that the tooltip/modal appears.
    -   Confirm that the word "test" and a horizontal line appear above the list of totals.
2.  **Mobile** (can be simulated by resizing browser window or using dev tools, but user specifically mentioned mobile client):
    -   Use the "Toggle Mobile View" or simply resize window to mobile size if responsive.
    -   Tap on the Budget Month header/summary to open the modal (or where the summary is shown).
    -   Verify the same "test" and horizontal line appear.

### Automated Tests
-   If there are existing tests for `TotalsList`, run them to check for regressions.
-   Snapshot tests might fail and need updating.

# Replace "test" with "Goals Target" in Budget Modal

The user wants to display the "Goals Target" (summary of all category budget goals for the month) in the budget modal (specifically the "To Budget" / "Overbudgeted" hover modal) replacing the placeholder "test".

## User Review Required
None

## Proposed Changes

### Budget Context Layer
#### [MODIFY] [TargetAmountsContext.tsx](file:///home/chid/git/actual/packages/desktop-client/src/components/budget/TargetAmountsContext.tsx)
-   Update `TargetAmountsContextType` to include `totalGoal: number`.
-   Update `calculateTargetValues` to calculate the sum of all `budget.goal` (raw goal amount) for the current month.
-   IMPORTANT: Ensure this data is available even if `showTargetAmounts` is false, OR ensure that `TotalsList` can trigger it.
    -   Currently `useEffect` depends on `showTargetAmounts`.
    -   I will modify it to run if `hasGoals` is needed, or just run it?
    -   Actually, for now, let's keep the logic but check if `TotalsList` being rendered implies we can fetch.
    -   Better approach: `TargetAmountsContext` seems to be the place for "Target" related data. I will modify the provider to calculate `totalGoal` which is simply the sum of all goals. I might need to make the effect independent of `showTargetAmounts` or provide a way to request it.
    -   However, fetching on every month change seems acceptable. I will remove `showTargetAmounts` check for the *calculation* or split it.
    -   Refinement: `showTargetAmounts` toggles the column. The modal is separate. I should probably just fetch it.

### Budget UI
#### [MODIFY] [TotalsList.tsx](file:///home/chid/git/actual/packages/desktop-client/src/components/budget/envelope/budgetsummary/TotalsList.tsx)
-   Import `useTargetAmounts`.
-   Access `totalGoal` from context.
-   Replace:
    ```tsx
    <Block>test</Block>
    ```
    With:
    ```tsx
    <Block>Goals Target: {format(totalGoal, 'financial')}</Block>
    ```
    (Using appropriate formatting and labeling)

### Mobile Fix
#### [MODIFY] [EnvelopeBudgetSummaryModal.tsx](file:///home/chid/git/actual/packages/desktop-client/src/components/modals/EnvelopeBudgetSummaryModal.tsx)
-   Wrap `TotalsList` with `TargetAmountsProvider`.
-   This is required because `TotalsList` now consumes `TargetAmountsContext`, and this modal is used in mobile where the context might not be provided by a parent.

## Verification Plan

### Manual Verification
1.  **Navigate to Budget**: Go to the budget page.
2.  **Set Goals**: Ensure some categories have goals set (Templates or Monthly).
3.  **Hover Modal**: Hover over the "To Budget" / "Overbudgeted" number at the top.
4.  **Verify**: Check that "Goals Target" is displayed with the correct sum of goals.
5.  **Verify Updates**: Change a goal amount and verify the modal updates.

