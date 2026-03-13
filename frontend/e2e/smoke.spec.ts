import { test, expect } from "@playwright/test";

test.describe("Vector frontend smoke", () => {
  test("landing page loads and shows Vector", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(page.getByRole("link", { name: /^Vector$/ })).toBeVisible({ timeout: 15000 });
  });

  test("simulate page loads and has Simulate Risk Assessment", async ({ page }) => {
    await page.goto("/simulate", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(page.getByRole("heading", { name: /Swap Risk Simulator/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /Simulate Risk Assessment/i })).toBeVisible();
  });

  test("simulate page shows quick-fill presets", async ({ page }) => {
    await page.goto("/simulate", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(page.getByRole("button", { name: /ALLOW/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /WARN/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /BLOCK/i })).toBeVisible({ timeout: 10000 });
  });

  test("dashboard page loads", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(page.getByRole("heading", { name: /Operator Dashboard/i })).toBeVisible({ timeout: 10000 });
  });

  test("pools page loads", async ({ page }) => {
    await page.goto("/pools", { waitUntil: "domcontentloaded", timeout: 45000 });
    await expect(page.getByRole("heading", { name: /Pool/i }).first()).toBeVisible({ timeout: 10000 });
  });
});
