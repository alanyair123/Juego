import { encode } from "next-auth/jwt";
import type { BrowserContext } from "@playwright/test";
import { AUTH_SESSION_COOKIE, TEST_AUTH_SECRET } from "../auth-constants";

export async function setTestSession(context: BrowserContext): Promise<void> {
  const token = await encode({
    token: {
      name: "E2E Player",
      sub: "e2e-player",
    },
    secret: TEST_AUTH_SECRET,
    salt: AUTH_SESSION_COOKIE,
  });

  await context.addCookies([
    {
      name: AUTH_SESSION_COOKIE,
      value: token,
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
