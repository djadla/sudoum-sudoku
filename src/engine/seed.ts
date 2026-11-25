/** 무작위 seed. 공유·재현에 쓰므로 32비트 양의 정수로 제한한다. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}
