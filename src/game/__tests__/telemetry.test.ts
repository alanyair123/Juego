import { describe, expect, it } from "vitest";
import { telemetryQuerySchema } from "../schemas";

describe("telemetry query schema", () => {
  it("uses default pagination values", () => {
    expect(telemetryQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
  });

  it("rejects page zero", () => {
    expect(telemetryQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });

  it("rejects page sizes above 100", () => {
    expect(telemetryQuerySchema.safeParse({ pageSize: "1000" }).success).toBe(false);
  });

  it("converts numeric URL values into numbers", () => {
    expect(telemetryQuerySchema.parse({ page: "3", pageSize: "10" })).toEqual({
      page: 3,
      pageSize: 10,
    });
  });
});
