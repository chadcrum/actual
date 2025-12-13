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
