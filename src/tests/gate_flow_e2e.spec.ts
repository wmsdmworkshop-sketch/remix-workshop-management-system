import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("DWIP Platform Gate In to Gate Out Workflow", () => {
  const DEPLOY_URL = "https://wms-workshop-app-473233046183.asia-south1.run.app";
  const TEST_IMG_PATH = "C:\\\\Users\\\\arhaa\\\\.gemini\\\\antigravity-ide\\\\brain\\\\eec6a54f-217c-4351-8ee0-e6860c21fa95\\\\scratch\\\\test_upload.png";
  
  test("Scenario 1: Full evidence collection", async ({ page }) => {
    test.setTimeout(120000);
    const apiLogs: any[] = [];
    
    // Log API responses
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/job-cards') || url.includes('/api/vehicle') || url.includes('/api/gate')) {
        try {
          const body = await response.json().catch(() => null);
          apiLogs.push({
            method: response.request().method(),
            url,
            status: response.status(),
            body
          });
        } catch(e) {}
      }
    });

    // 1. Navigate and Login
    await page.goto(DEPLOY_URL);
    await page.fill('input[name="username"]', 'mustafaladaf50@gmail.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for Dashboard
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshot_after_login.png' });
    console.log("Captured: screenshot_after_login.png");

    // 2. Navigate to Gate Entry
    await page.getByText("Workshop Operations").first().click();
    await page.waitForTimeout(500);
    await page.getByText("Gate Entry", { exact: true }).first().click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshot_after_gate_entry.png' });
    console.log("Captured: screenshot_after_gate_entry.png");

    // 3. Register Entry
    await page.fill('input[placeholder*="MH-12"]', 'MH-12-PQ-4567');
    await page.fill('input[placeholder*="98765"]', '9876543210');
    await page.fill('input[placeholder*="Robert"]', 'Robert Downey');
    await page.fill('input[placeholder*="45200"]', '45200');
    await page.click('button:has-text("Register Gate Inward")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshot_after_job_card_creation.png' });
    console.log("Captured: screenshot_after_job_card_creation.png");

    // 5. Job Cards Tab
    await page.getByText("Job Cards", { exact: true }).first().click();
    await page.waitForTimeout(2000);
    
    // Start Repair
    const startRepairBtn = page.getByText("Start Repair");
    if (await startRepairBtn.count() > 0) {
        // Find closest bay select
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
    
    // 6. Gate Out
    await page.getByText("Gate Entry", { exact: true }).first().click();
    await page.waitForTimeout(2000);
    
    const gateOutBtn = page.getByText("Issue Gate-Out Pass");
    if (await gateOutBtn.count() > 0) {
        await gateOutBtn.first().click();
        await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: 'screenshot_after_gate_out.png' });
    console.log("Captured: screenshot_after_gate_out.png");

    // Dump API logs
    fs.writeFileSync('api_logs.json', JSON.stringify(apiLogs, null, 2));
    console.log("Saved API logs to api_logs.json");
  });
});
