export function mixinClass<T extends object>(target: T, source: object) {
  for (const key in source) {
    (target as Record<string, unknown>)[key] = (
      source as Record<string, unknown>
    )[key];
  }
}
