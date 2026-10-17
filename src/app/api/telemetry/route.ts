import { auth } from "@/auth";
import { telemetryQuerySchema } from "@/game/schemas";
import { getTelemetryPage } from "@/lib/telemetry";

export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = telemetryQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid pagination parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    return Response.json(await getTelemetryPage(parsed.data));
  } catch (error) {
    console.error("Failed to read telemetry:", error);
    return Response.json({ error: "Unable to load telemetry" }, { status: 500 });
  }
}
