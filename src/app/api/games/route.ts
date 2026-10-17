import { auth } from "@/auth";
import { gameRecordSchema } from "@/game/schemas";
import { getPool } from "@/lib/db";

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playerId = session.user.id || session.user.email;
  if (!playerId) {
    return Response.json({ error: "Session has no player identity" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = gameRecordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid game record", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const record = parsed.data;
    const result = await getPool().query<{ id: string }>(
      `INSERT INTO game_records
         (player_id, level_reached, enemies_killed, time_seconds, inventory)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id`,
      [
        playerId,
        record.levelReached,
        record.enemiesKilled,
        record.timeSeconds,
        JSON.stringify(record.inventory),
      ],
    );
    return Response.json({ id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    console.error("Failed to save game record:", error);
    return Response.json({ error: "Unable to save game record" }, { status: 500 });
  }
}
