import { expect, test } from "@playwright/test";

test("keyboard input moves the player in solo mode", async ({ page }) => {
  await page.goto("/play");
  const canvas = page.getByTestId("game-canvas");
  await expect(canvas).toBeVisible();
  await expect.poll(async () => canvas.getAttribute("data-player-x")).not.toBe("");
  await expect.poll(async () => canvas.getAttribute("data-player-y")).not.toBe("");

  const startX = await canvas.getAttribute("data-player-x");
  const startY = await canvas.getAttribute("data-player-y");
  const keys = ["ArrowRight", "ArrowDown", "w", "a", "s", "d"];

  for (const key of keys) {
    await page.keyboard.press(key);
  }

  await expect
    .poll(async () => {
      const currentX = await canvas.getAttribute("data-player-x");
      const currentY = await canvas.getAttribute("data-player-y");
      return currentX !== startX || currentY !== startY;
    })
    .toBe(true);
});
