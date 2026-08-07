import { test, expect } from "@playwright/test";
import fs from "fs";

test.describe("Dump HTML", () => {
  const DEPLOY_URL = "https://wms-workshop-app-473233046183.asia-south1.run.app";
  
  test("Dump HTML after login", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(DEPLOY_URL);
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'Admin@DWIP2026');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);
    const html = await page.content();
    fs.writeFileSync('page_dump.html', html);
  });
});
