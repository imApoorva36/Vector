import { test, expect } from "@playwright/test";

test.describe("Vector frontend smoke", () => {
  test("landing page loads and shows Vector", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Vector").first()).toBeVisible({ timeout: 10000 });
  });

  test("simulate page loads and has Simulate Risk Assessment", async ({ page }) => {
    await page.goto("/simulate");
    await expect(page.getByRole("heading", { name: /Swap Risk Simulator/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Simulate Risk Assessment/i })).toBeVisible();
  });

  test("simulate with mock returns a result", async ({ page }) => {
    await page.goto("/simulate");
    await page.getByRole("button", { name: /Simulate Risk Assessment/i }).click();
    await expect(page.locator("text=ALLOW").or(page.locator("text=BLOCK")).or(page.locator("text=WARN"))).toBeVisible({ timeout: 15000 });
  });

  test("dashboard page loads", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Operator Dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test("pools page loads", async ({ page }) => {
    await page.goto("/pools");
    await expect(page.getByRole("heading", { name: /Pool/i }).first()).toBeVisible({ timeout: 10000 });
  });
});
