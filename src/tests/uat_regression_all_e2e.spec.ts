import { test, expect } from "@playwright/test";

const DEPLOY_URL = "https://dwip-enterprise-772298398554.asia-south1.run.app";

const rolesToTest = [
  { role: "Admin", username: "admin", password: "Admin@DWIP2026" },
  { role: "Developer", username: "sayeed_dp", password: "Dev@12345" },
  { role: "Service Advisor", username: "mustafaladaf50@gmail.com", password: "password123" }
];

test.describe("UAT REGRESSION - ATS LOGIN ALL ROLES", () => {
  for (const user of rolesToTest) {
    test(`Login as ${user.role}`, async ({ page }) => {
      await page.goto(DEPLOY_URL);
      await page.fill('input[type="text"]', user.username);
      await page.fill('input[type="password"]', user.password);
      await page.click('button[type="submit"]');
      
      // Check for success: wait for dashboard or specific text
      await expect(page.locator('text=DWIP Enterprise').first()).toBeVisible({ timeout: 15000 });
      await page.waitForLoadState("networkidle");
    });
  }
});

test.describe("UAT REGRESSION - GATE IN TO GATE OUT", () => {
  test("Full Gate In to Gate Out Flow", async ({ page }) => {
    test.setTimeout(120000);
    
    // 1. Navigate and Login as gate_security or advisor
    await page.goto(DEPLOY_URL);
    await page.fill('input[type="text"]', 'mustafaladaf50@gmail.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // 2. Navigate to Gate Entry
    await page.getByText("Workshop Operations").first().click();
    await page.waitForTimeout(500);
    await page.getByText("Gate Entry", { exact: true }).first().click();
    await page.waitForTimeout(1000);

    // 3. Register Entry
    const testVrn = 'MH-12-PQ-9999';
    await page.fill('input[placeholder*="MH-12"]', testVrn);
    await page.fill('input[placeholder*="98765"]', '9876543210');
    await page.fill('input[placeholder*="Robert"]', 'Test Customer');
    await page.fill('input[placeholder*="45200"]', '10000');
    await page.click('button:has-text("Register Gate Inward")');
    await page.waitForTimeout(3000);

    // 4. Job Cards Tab
    await page.getByText("Job Cards", { exact: true }).first().click();
    await page.waitForTimeout(2000);
    
    // Start Repair
    const startRepairBtn = page.getByText("Start Repair");
    if (await startRepairBtn.count() > 0) {
        const baySelect = page.locator('select').first();
        if (await baySelect.count() > 0) {
            await baySelect.selectOption({ index: 1 });
        }
        await startRepairBtn.first().click();
        await page.waitForTimeout(2000);
    }
    
    // Complete Work
    const completeBtn = page.getByText("Complete Work");
    if (await completeBtn.count() > 0) {
        await completeBtn.first().click();
        await page.waitForTimeout(2000);
    }
    
    // 5. Gate Out
    await page.getByText("Gate Entry", { exact: true }).first().click();
    await page.waitForTimeout(2000);
    
    const gateOutBtn = page.getByText("Issue Gate-Out Pass");
    if (await gateOutBtn.count() > 0) {
        await gateOutBtn.first().click();
        await page.waitForTimeout(2000);
    }
  });
});
