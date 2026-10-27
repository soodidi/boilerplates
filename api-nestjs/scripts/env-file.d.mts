export declare const GENERATED: Record<string, () => string>;
export declare function keysOf(content: string): Set<string>;
export declare function syncEnv(
  example: string,
  current: string | null,
): { content: string | null; added: string[] };
