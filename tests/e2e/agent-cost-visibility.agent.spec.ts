import { expect, test, type Page } from './fixtures/auth.fixture';

type VehicleRow = Record<string, unknown> & {
  vehicleTypeId?: number;
  isAssigned?: boolean;
};

type ItineraryDetails = {
  vehicles?: VehicleRow[];
  costBreakdown?: Record<string, unknown>;
};

const API_BASE_URL = String(process.env.E2E_API_BASE_URL || '').replace(/\/$/, '');
const QUOTE_ID = String(process.env.E2E_ITINERARY_QUOTE_ID || '').trim();

async function getDetails(page: Page): Promise<ItineraryDetails> {
  const token = await page.evaluate(() => window.localStorage.getItem('accessToken'));
  expect(token, 'Authenticated access token was not found in localStorage').toBeTruthy();

  const response = await page.request.get(
    `${API_BASE_URL}/itineraries/details/${encodeURIComponent(QUOTE_ID)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(response.ok(), `Itinerary details API failed: ${response.status()}`).toBeTruthy();
  return (await response.json()) as ItineraryDetails;
}

async function openItinerary(page: Page): Promise<void> {
  await page.goto(`/itinerary-details/${encodeURIComponent(QUOTE_ID)}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page).toHaveURL(new RegExp(`/itinerary-details/${QUOTE_ID}$`), { timeout: 30_000 });
  await expect(page.getByText(/VEHICLE LIST FOR/i).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#vehicle-list-section')).toBeVisible();
}

function requireVehicles(details: ItineraryDetails): VehicleRow[] {
  const vehicles = Array.isArray(details.vehicles) ? details.vehicles : [];
  expect(vehicles.length, `No vehicle rows were returned for ${QUOTE_ID}`).toBeGreaterThan(0);
  return vehicles;
}

test.describe('agent itinerary cost visibility @agent', () => {
  test.skip(!API_BASE_URL || !QUOTE_ID, 'Set E2E_API_BASE_URL and E2E_ITINERARY_QUOTE_ID in .env.e2e');

  test('agent sees only the assigned vehicle and final totals', async ({ agentPage }) => {
    await openItinerary(agentPage);
    const details = await getDetails(agentPage);
    const vehicles = requireVehicles(details);

    // The agent API must return one auto-selected row per vehicle type.
    const rowsByType = new Map<number, VehicleRow[]>();
    for (const vehicle of vehicles) {
      const typeId = Number(vehicle.vehicleTypeId || 0);
      const rows = rowsByType.get(typeId) || [];
      rows.push(vehicle);
      rowsByType.set(typeId, rows);

      expect(vehicle.vendorName ?? null).toBeNull();
      expect(vehicle.branchName ?? null).toBeNull();
      expect(vehicle.dayWisePricing).toBeUndefined();
      expect(vehicle.rentalCharges).toBeUndefined();
      expect(vehicle.tollCharges).toBeUndefined();
      expect(vehicle.parkingCharges).toBeUndefined();
      expect(vehicle.driverCharges).toBeUndefined();
      expect(vehicle.permitCharges).toBeUndefined();
      expect(vehicle.vendorMarginAmount).toBeUndefined();
      expect(vehicle.grandTotal).toBeUndefined();
      expect(vehicle.totalAmount).toBeDefined();
    }
    for (const rows of rowsByType.values()) expect(rows).toHaveLength(1);

    const costBreakdown = details.costBreakdown || {};
    expect(costBreakdown.totalAmount).toBeDefined();
    expect(costBreakdown.netPayable).toBeDefined();
    expect(costBreakdown.totalVehicleCost).toBeUndefined();
    expect(costBreakdown.totalHotelAmount).toBeUndefined();
    expect(costBreakdown.additionalMargin).toBeUndefined();
    expect(costBreakdown.agentMargin).toBeUndefined();

    const vehicleSection = agentPage.locator('#vehicle-list-section');
    await expect(vehicleSection.getByText('Vendor Name', { exact: true })).toHaveCount(0);
    await expect(vehicleSection.getByText('Branch Name', { exact: true })).toHaveCount(0);
    await expect(vehicleSection.locator('input[type="radio"]')).toHaveCount(0);
    await expect(agentPage.getByText('Day-wise Pricing Breakdown', { exact: true })).toHaveCount(0);
    await expect(agentPage.getByText('Charge Summary', { exact: true })).toHaveCount(0);
    await expect(agentPage.getByText('Consolidated Totals', { exact: true })).toHaveCount(0);
    await expect(agentPage.getByText(/Vendor Margin|Margin Service Tax|Additional Margin/i)).toHaveCount(0);
    await expect(agentPage.getByText('OVERALL COST', { exact: true })).toBeVisible();
    await expect(agentPage.getByText('Total Amount', { exact: true }).last()).toBeVisible();

    // Clicking the row must not open a hidden cost-breakdown panel for agents.
    await vehicleSection.locator('tbody tr').first().click();
    await expect(agentPage.getByText('Day-wise Pricing Breakdown', { exact: true })).toHaveCount(0);
  });

  test('admin retains vehicle selection and cost breakdown access', async ({ adminPage }) => {
    await openItinerary(adminPage);
    const details = await getDetails(adminPage);
    const vehicles = requireVehicles(details);
    const firstVehicle = vehicles[0];

    expect(firstVehicle).toHaveProperty('dayWisePricing');
    expect(firstVehicle).toHaveProperty('rentalCharges');
    expect(firstVehicle).toHaveProperty('tollCharges');
    expect(details.costBreakdown).toHaveProperty('totalVehicleCost');

    const vehicleSection = adminPage.locator('#vehicle-list-section');
    await expect(vehicleSection.getByText('Vendor Name', { exact: true })).toBeVisible();
    await expect(vehicleSection.locator('input[type="radio"]')).toHaveCount(vehicles.length);
    await expect(adminPage.getByText('OVERALL COST', { exact: true })).toBeVisible();

    // The price cell exposes the PHP-style breakdown tooltip for privileged users.
    await vehicleSection.locator('tbody tr').first().locator('td').last().hover();
    await expect(adminPage.getByText('Subtotal Vehicle', { exact: true })).toBeVisible();
  });
});
