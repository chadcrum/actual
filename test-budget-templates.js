// Test file to debug the budget/get-budget-templates endpoint
// Run this in the browser console on http://localhost:3001/budget

async function testGetBudgetTemplates() {
  console.log('Testing budget/get-budget-templates...');

  try {
    // Get the current month from the page
    const monthElement = document.querySelector(
      '[data-testid="budget-summary"]',
    );
    if (!monthElement) {
      console.error('Could not find budget summary element');
      return;
    }

    // Try to get the month from the sheet context
    const month = '2025-11'; // Replace with current month

    console.log('Fetching templates for month:', month);

    // Import send from the app
    const { send } = await import('loot-core/platform/client/fetch');

    const result = await send('budget/get-budget-templates', { month });

    console.log('Success! Result:', result);
    console.log('Type of result:', typeof result);
    console.log('Is array:', Array.isArray(result));
    console.log('Keys:', Object.keys(result || {}));

    return result;
  } catch (error) {
    console.error('Error fetching templates:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Run the test
testGetBudgetTemplates();
