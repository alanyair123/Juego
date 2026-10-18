import { expect, test } from "@playwright/test";

test("a player creates a room and toggles readiness", async ({ page }) => {
  await page.goto("/lobby");
  await page.getByTestId("nickname-input").fill("E2E Scout");
  await page.getByTestId("create-room").click();

  await expect(page.getByRole("heading", { name: "Sala de E2E Scout" })).toBeVisible();
  const status = page.getByTestId("player-status");
  await expect(status).toHaveText("No listo");

  await page.getByTestId("ready-toggle").click();
  await expect(status).toHaveText("Listo");

  await page.getByTestId("ready-toggle").click();
  await expect(status).toHaveText("No listo");
});
