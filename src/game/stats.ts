export function calculateDamage({
  attack,
  defense,
  isCrit,
}: {
  attack: number;
  defense: number;
  isCrit: boolean;
}): number {
  const baseDamage = Math.max(1, attack - Math.floor(defense / 2));
  return isCrit ? baseDamage * 2 : baseDamage;
}

export function xpForLevel(level: number): number {
  return Math.floor(100 * level ** 1.5);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level)) {
    level += 1;
  }
  return level;
}

export function enemyHp(level: number): number {
  return 10 + (level - 1) * 4;
}

export function enemyAttack(level: number): number {
  return 3 + (level - 1) * 2;
}

export function xpReward(enemyLevel: number): number {
  return 10 + enemyLevel * 5;
}
