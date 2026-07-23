import { expect, test } from './fixtures/auth.fixture';

test('location edit keeps route identity fields read-only', async ({ adminPage }) => {
  await adminPage.goto('/locations', { waitUntil: 'domcontentloaded' });
  await expect(adminPage.getByRole('heading', { name: 'List of Locations' })).toBeVisible();

  const firstRow = adminPage.locator('tbody tr').first();
  await expect(firstRow).toBeVisible();

  const sourceLocation = (await firstRow.locator('td').nth(2).innerText()).trim();
  const destinationLocation = (await firstRow.locator('td').nth(3).innerText()).trim();
  await firstRow.locator('button').nth(1).click();

  const dialog = adminPage.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const sourceInput = dialog.getByLabel('Source Location', { exact: true });
  const sourceCityInput = dialog.getByLabel('Source Location City', { exact: true });
  const sourceStateInput = dialog.getByLabel('Source Location State', { exact: true });
  const destinationInput = dialog.getByLabel('Destination Location', { exact: true });
  const destinationCityInput = dialog.getByLabel('Destination Location City', { exact: true });
  const destinationStateInput = dialog.getByLabel('Destination Location State', { exact: true });

  await expect(sourceInput).toHaveValue(sourceLocation);
  await expect(destinationInput).toHaveValue(destinationLocation);

  for (const input of [
    sourceInput,
    sourceCityInput,
    sourceStateInput,
    destinationInput,
    destinationCityInput,
    destinationStateInput,
  ]) {
    await expect(input).toHaveAttribute('readonly', '');
    await expect(input).not.toBeEditable();
  }

  await expect(dialog.locator('input[type="number"]').first()).toBeEditable();
});
