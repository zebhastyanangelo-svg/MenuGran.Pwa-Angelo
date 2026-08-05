import { Page, BrowserContext, Browser, expect, devices } from "@playwright/test";

export const MOCK_COORDS = { latitude: 10.4806, longitude: -66.9036 };

/**
 * Creates a mobile browser context with geolocation granted and seeded
 * with mock coordinates matching the La Parrilla de Juan restaurant in the
 * seed data. Used for the Cliente flow.
 */
export async function newClienteContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    ...devices["Pixel 5"],
    permissions: ["geolocation"],
    geolocation: MOCK_COORDS,
    locale: "es-VE",
  });
}

/**
 * Creates a desktop browser context for the Operator flow. Plain Chrome,
 * no special permissions.
 */
export async function newOperatorContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    locale: "es-VE",
  });
}

/**
 * Registers a fresh customer via the public /register form.
 * Uses dynamic timestamped email to avoid 409 collisions.
 * Returns the email used.
 */
export async function registerCustomer(page: Page): Promise<string> {
  const email = `cliente_${Date.now()}@example.com`;
  await page.goto("/register");

  await page.locator("#nombre").waitFor({ state: "visible" });

  await page.locator("#nombre").fill("Cliente E2E");
  await page.locator("#email").fill(email);
  await page.locator("#telefono").fill("04141112233");
  await page.locator("#password").fill("test1234");
  await page.locator("#aceptarTerminos").check();

  await page.getByRole("button", { name: /crear cuenta/i }).click();

  await page.waitForURL((url) => !url.pathname.includes("/register"), {
    timeout: 20_000,
  });

  return email;
}

/**
 * Logs in an existing operator (cedula + 4-digit PIN) at /operator-login.
 * The seed creates user cedula=12345678 / pin=2222 with role ADMIN.
 */
export async function loginOperator(page: Page, cedula = "12345678", pin = "2222"): Promise<void> {
  await page.goto("/operator-login");
  await page.locator("#cedula").waitFor({ state: "visible" });
  await page.locator("#cedula").fill(cedula);
  await page.locator("#pin").fill(pin);
  await page.getByRole("button", { name: /ingresar al panel/i }).click();

  await page.waitForURL(/\/operator(\/|$)/, { timeout: 15_000 });
}

/**
 * Adds the first available menu item from a restaurant page to the cart.
 * The "+" buttons in /client/r/[id] have no text — match by role.
 */
export async function addFirstItemToCart(page: Page): Promise<void> {
  await page.locator("a[href^='/client/r/']").first().click();
  // Wait for menu to render
  await page.waitForLoadState("networkidle", { timeout: 10_000 });

  const addBtn = page.getByRole("button", { name: /\+/ }).first();
  await addBtn.waitFor({ state: "visible" });
  await addBtn.click();
}

/**
 * Completes checkout in /client/checkout.
 *
 * Steps:
 *   - Select DELIVERY
 *   - Fill address
 *   - Click geolocation button (uses context.setGeolocation mocks)
 *   - Submit and wait for /order-status/:orderId
 *
 * Returns the captured orderId.
 */
export async function checkoutWithGeolocation(page: Page): Promise<string> {
  await page.goto("/client/checkout");

  await page.getByRole("button", { name: /^delivery$/i }).click();

  await page.locator("#deliveryAddress").fill("Av. Test, Caracas");
  await page.getByRole("button", { name: /usar mi ubicación actual/i }).click();

  await expect(page.getByText(/Ubicación detectada/)).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: /realizar pedido/i }).click();

  await page.waitForURL(/\/order-status\/[a-z0-9]+/i, { timeout: 20_000 });
  const match = page.url().match(/\/order-status\/([a-z0-9]+)/i);
  if (!match) throw new Error(`Could not capture orderId from url: ${page.url()}`);
  return match[1];
}

/**
 * PATCHes the order status using the operator's authenticated context.
 *
 * Why direct API instead of clicking UI buttons in /operator/orders:
 * the operator orders page (src/app/(operator)/operator/orders/page.tsx)
 * uses hardcoded mock data — the "Cocinar/Listo" buttons mutate local
 * React state only and never call PATCH /api/orders/:id. The real
 * status transition only happens via this API endpoint, gated by
 * withAuth({ requiredRole: ["ADMIN","EMPLOYEE","SUPER_ADMIN"] }).
 */
export async function patchOrderStatus(
  context: BrowserContext,
  orderId: string,
  status: "PREPARING" | "DELIVERING" | "DELIVERED" | "READY"
): Promise<void> {
  const base = process.env.BASE_URL ?? "http://localhost:3000";
  const res = await context.request.patch(`${base}/api/orders/${orderId}`, {
    data: { status },
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok()) {
    throw new Error(`PATCH /api/orders/${orderId} returned ${res.status()}: ${await res.text()}`);
  }
}
