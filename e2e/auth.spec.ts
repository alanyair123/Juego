import { expect, test } from "@playwright/test";
import { setTestSession } from "./helpers/session";

test("unauthenticated telemetry page redirects to login", async ({ page }) => {
  await page.goto("/telemetry");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Inicia sesión" })).toBeVisible();
});

test("unauthenticated telemetry API responds with 401", async ({ request }) => {
  const response = await request.get("/api/telemetry");
  expect(response.status()).toBe(401);
});

test("login page offers only Google and GitHub", async ({ page }) => {
  await page.goto("/login");
  const buttons = page.getByRole("main").getByRole("button");
  await expect(buttons).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar con GitHub" })).toBeVisible();
});

test("a valid session can access telemetry", async ({ page, context }) => {
  test.skip(!process.env.DATABASE_URL, "Requires PostgreSQL; CI provides a seeded database.");
  await setTestSession(context);

  const response = await page.request.get("/api/telemetry");
  expect(response.status()).toBe(200);
  const result: unknown = await response.json();
  expect(result).toMatchObject({
    rows: expect.any(Array),
    total: expect.any(Number),
  });

  await page.goto("/telemetry");
  await expect(page.getByRole("heading", { name: "Telemetría" })).toBeVisible();
});
