import { describe, expect, it } from "vitest";
import {
  calculateDamage,
  enemyAttack,
  enemyHp,
  levelFromXp,
  xpForLevel,
} from "../stats";

describe("game stats", () => {
  it("always deals at least one damage", () => {
    expect(calculateDamage({ attack: 1, defense: 100, isCrit: false })).toBe(1);
  });

  it("calculates base damage from attack and half defense", () => {
    expect(calculateDamage({ attack: 10, defense: 4, isCrit: false })).toBe(8);
  });

  it("doubles damage on a critical hit", () => {
    expect(calculateDamage({ attack: 10, defense: 4, isCrit: true })).toBe(16);
  });

  it("requires more experience for each successive level", () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1));
    expect(xpForLevel(3)).toBeGreaterThan(xpForLevel(2));
  });

  it("maps zero XP to level one and a level threshold to the next level", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpForLevel(1))).toBe(2);
  });

  it("scales enemy health and attack with level", () => {
    expect(enemyHp(2)).toBeGreaterThan(enemyHp(1));
    expect(enemyAttack(2)).toBeGreaterThan(enemyAttack(1));
  });
});
