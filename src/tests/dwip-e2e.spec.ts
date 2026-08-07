import { test, expect } from "@playwright/test";

test.describe("DWIP Platform End-to-End Business Workflows", () => {
  const DEPLOY_URL = process.env.DEPLOY_URL || "https://wms-workshop-app-473233046183.asia-south1.run.app";

  test("should login successfully and view dashboard", async ({ page }) => {
    // 1. Navigate to login page
    await page.goto(DEPLOY_URL);
    
    // 2. Expect title to be DWIP Enterprise
    await expect(page).toHaveTitle(/DWIP Enterprise/);

    // 3. Fill in login credentials
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'Admin@DWIP2026');

    // 4. Submit login form
    await page.click('button[type="submit"]');

    // 5. Verify successful login by waiting for a dashboard element
    await expect(page.locator('text=DWIP Enterprise').first()).toBeVisible({ timeout: 10000 });
    
    // Wait for network idle to ensure dashboard is loaded
    await page.waitForLoadState("networkidle");
  });
});
