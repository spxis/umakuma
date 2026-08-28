export type RandomSource = () => number;

/**
 * Deterministic RNG so Daily Challenge can build the identical question set for
 * every account from the same date seed. Uses xmur3 for seeding + mulberry32.
 */
export function seededRandom(seed: string): RandomSource {
  let hash = 1_779_033_703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3_432_918_353);
    hash = (hash << 13) | (hash >>> 19);
  }

  let state = (Math.imul(hash ^ (hash >>> 16), 2_246_822_507) ^ Math.imul(hash ^ (hash >>> 13), 3_266_489_909)) >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function shuffleWith<T>(items: T[], random: RandomSource = Math.random): T[] {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex]!, output[index]!];
  }
  return output;
}

export function pickWith<T>(items: T[], random: RandomSource = Math.random): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(random() * items.length)] ?? null;
}
