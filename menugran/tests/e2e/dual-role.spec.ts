import { test, expect, Page } from "@playwright/test";
import {
  MOCK_COORDS,
  newClienteContext,
  newOperatorContext,
  registerCustomer,
  loginOperator,
  addFirstItemToCart,
  checkoutWithGeolocation,
  patchOrderStatus,
} from "./utils";

/**
 * Dual-role E2E: Cliente (mobile, geolocation granted) + Operator (desktop).
 *
 * Phase 1 — Cliente:
 *   - register dynamic account
 *   - add first available menu item
 *   - checkout with geolocation mock
 *   - land on /order-status/:id, verify initial PENDING render
 *
 * Phase 2 — Operator:
 *   - log in as ADMIN (seed: cedula 12345678, pin 2222)
 *   - PATCH order status to PREPARING, then DELIVERING
 *     (direct API because operator-orders page uses mock data — see utils.ts)
 *
 * Sync verification:
 *   - switch back to Cliente tab, wait up to 6s for the 3s polling cycle
 *     in LiveOrderTracker, assert DELIVERING is reflected in the DOM
 *     without a manual reload.
 */
test.describe("Dual-role E2E", () => {
  let clientePage: Page;
  let clienteContext: Awaited<ReturnType<typeof newClienteContext>>;
  let operatorPage: Page;
  let operatorContext: Awaited<ReturnType<typeof newOperatorContext>>;

  test.beforeAll(async ({ browser }) => {
    clienteContext = await newClienteContext(browser);
    operatorContext = await newOperatorContext(browser);

    clientePage = await clienteContext.newPage();
    operatorPage = await operatorContext.newPage();
  });

  test.afterAll(async () => {
    await clienteContext?.close();
    await operatorContext?.close();
  });

  test("cliente places order, operator advances status, cliente sees sync", async () => {
    // ─────────────────────────────────────────────
    // PHASE 1: Cliente
    // ─────────────────────────────────────────────
    const consoleErrors: string[] = [];
    clientePage.on("pageerror", (err) => consoleErrors.push(`[cliente] ${err.message}`));
    clientePage.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`[cliente:console] ${msg.text()}`);
    });

    await test.step("Cliente: dynamic registration", async () => {
      const email = await registerCustomer(clientePage);
      expect(email).toMatch(/^cliente_\d+@example\.com$/);
    });

    let orderId = "";
    await test.step("Cliente: add item and checkout with geolocation", async () => {
      await clientePage.goto("/client");
      // Catalog loaded by client component
      await clientePage.waitForLoadState("networkidle");

      await addFirstItemToCart(clientePage);
      orderId = await checkoutWithGeolocation(clientePage);
      expect(orderId).toBeTruthy();
      console.log(`[E2E] Order created: ${orderId}`);
    });

    await test.step("Cliente: verify /order-status/:id renders initial state", async () => {
      await expect(clientePage).toHaveURL(new RegExp(`/order-status/${orderId}`));
      // LiveOrderTracker renders heading "Pedido" or order id; the live
      // polling kicks in immediately. Wait at least one poll cycle.
      await clientePage.waitForTimeout(3_500);
      // The exact text is i18n-dependent; assert any non-loading state.
      await expect(clientePage.locator("body")).not.toContainText("Cargando", {
        timeout: 10_000,
      });
      await clientePage.screenshot({ path: "test-results/cliente-tracker-initial.png" });
    });

    // ─────────────────────────────────────────────
    // PHASE 2: Operator (parallel browser context)
    // ─────────────────────────────────────────────
    await test.step("Operator: login at /operator-login", async () => {
      operatorPage.on("pageerror", (err) => consoleErrors.push(`[operator] ${err.message}`));
      await loginOperator(operatorPage);
      await expect(operatorPage).toHaveURL(/\/operator(\/|$)/);
      await operatorPage.screenshot({ path: "test-results/operator-dashboard.png" });
    });

    await test.step("Operator: PATCH order to PREPARING", async () => {
      await patchOrderStatus(operatorContext, orderId, "PREPARING");
    });

    await test.step("Operator: PATCH order to DELIVERING", async () => {
      await patchOrderStatus(operatorContext, orderId, "DELIVERING");
    });

    // ─────────────────────────────────────────────
    // Sync verification: back to Cliente
    // ─────────────────────────────────────────────
    await test.step("Cliente: verify status sync via 3s polling (no reload)", async () => {
      await clientePage.bringToFront();

      // The Cliente URL should still be /order-status/:id with NO manual reload.
      const urlBefore = clientePage.url();
      expect(urlBefore).toMatch(new RegExp(`/order-status/${orderId}`));

      // LiveOrderTracker polls every 3s. Allow up to 2 cycles + slack.
      // We assert DELIVERING appears in the rendered DOM (case-insensitive).
      await expect(clientePage.getByText(/entreg|delivery|delivering|en camino/i).first())
        .toBeVisible({ timeout: 12_000 });

      // And the URL didn't change (no client-side navigation / reload).
      expect(clientePage.url()).toBe(urlBefore);

      await clientePage.screenshot({ path: "test-results/cliente-tracker-synced.png" });
    });

    if (consoleErrors.length > 0) {
      console.warn("[E2E] console errors collected:", consoleErrors);
    }
    expect(consoleErrors).toEqual([]);
  });
});

/**
 * Lightweight smoke test: geolocation is actually injected (not just
 * rendered). Failures here mean Playwright contexts are not honoring
 * `permissions: ["geolocation"]` + `geolocation:` options.
 */
test("geolocation mock is honored in the cliente context", async ({ browser }) => {
  const ctx = await newClienteContext(browser);
  const page = await ctx.newPage();
  await page.goto("/client/checkout");

  // Trigger the geo button and verify our mock coords surface in the UI.
  await page.getByRole("button", { name: /^delivery$/i }).click();
  await page.getByRole("button", { name: /usar mi ubicación actual/i }).click();

  await expect(page.getByText(/Ubicación detectada/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(MOCK_COORDS.latitude.toFixed(6))).toBeVisible();
  await expect(page.getByText(MOCK_COORDS.longitude.toFixed(6))).toBeVisible();

  await ctx.close();
});
