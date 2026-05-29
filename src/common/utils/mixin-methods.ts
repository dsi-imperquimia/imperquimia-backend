export function mixinMethods<T extends object>(target: T, source: object) {
  for (const key in source) {
    if (typeof (source as Record<string, unknown>)[key] === 'function') {
      (target as Record<string, unknown>)[key] = (
        source as Record<string, unknown>
      )[key];
    }
  }
}
