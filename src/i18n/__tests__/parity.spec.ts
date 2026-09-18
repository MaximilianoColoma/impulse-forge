import { describe, expect, it } from "vitest";
import { de } from "../locales/de";
import { en } from "../locales/en";

function collectKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || obj === undefined) return [];
  if (Array.isArray(obj)) return [`${prefix}[array:${obj.length}]`];
  if (typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    collectKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("i18n parity DE <-> EN", () => {
  it("has identical key sets", () => {
    const deKeys = new Set(collectKeys(de));
    const enKeys = new Set(collectKeys(en));
    const onlyDe = [...deKeys].filter((k) => !enKeys.has(k));
    const onlyEn = [...enKeys].filter((k) => !deKeys.has(k));
    expect({ onlyDe, onlyEn }).toEqual({ onlyDe: [], onlyEn: [] });
  });

  it("has no empty strings", () => {
    const flat = (obj: unknown, path = ""): Array<[string, string]> => {
      if (typeof obj === "string") return [[path, obj]];
      if (Array.isArray(obj)) return obj.flatMap((v, i) => flat(v, `${path}[${i}]`));
      if (obj && typeof obj === "object")
        return Object.entries(obj).flatMap(([k, v]) => flat(v, path ? `${path}.${k}` : k));
      return [];
    };
    const empties = [...flat(de), ...flat(en)].filter(([, v]) => v.trim() === "");
    expect(empties).toEqual([]);
  });
});