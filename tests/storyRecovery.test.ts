import { describe, expect, test } from "bun:test";
import { saveCheckpoint, loadCheckpoint, registerBoot, markStable, mergeWithCheckpoint, clearCheckpoint, isCheckpointFresh, sanitize } from "../src/lib/storyRecovery";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
const story = (id: string, n: number, extra: any = {}) => ({ id, profile: {} as any, scenes: Array.from({ length: n }, (_, i) => ({ sceneTitle: `s${i}` } as any)), currentSceneIndex: n - 1, startedAt: "", lastPlayedAt: "", completed: false, choicesMade: 0, ...extra });

describe("crash breaker", () => {
  test("one crash still resumes; second crash within 60s trips", () => {
    const s = mem(); saveCheckpoint("u", story("a", 3) as any, 0, s);
    expect(registerBoot("u", "a", 1000, s)).toBe(false);
    expect(registerBoot("u", "a", 20000, s)).toBe(true);
  });
  test("crashes more than 60s apart do not trip", () => {
    const s = mem(); saveCheckpoint("u", story("a", 3) as any, 0, s);
    registerBoot("u", "a", 0, s);
    expect(registerBoot("u", "a", 61000, s)).toBe(false);
  });
  test("stable scene resets the counter", () => {
    const s = mem(); saveCheckpoint("u", story("a", 3) as any, 0, s);
    registerBoot("u", "a", 0, s); markStable("u", "a", s);
    expect(registerBoot("u", "a", 5000, s)).toBe(false);
  });
});

describe("checkpoint", () => {
  test("local copy ahead of database wins", () => {
    const s = mem(); saveCheckpoint("u", story("a", 6) as any, 0, s);
    const r = mergeWithCheckpoint(story("a", 5) as any, loadCheckpoint("u", s));
    expect(r.localAhead).toBe(true); expect(r.story!.scenes.length).toBe(6);
  });
  test("completed stories are never checkpointed", () => {
    const s = mem(); saveCheckpoint("u", story("a", 3, { completed: true }) as any, 0, s);
    expect(loadCheckpoint("u", s)).toBeNull();
  });
  test("other user's checkpoint is ignored", () => {
    const s = mem(); saveCheckpoint("u", story("a", 3) as any, 0, s);
    expect(loadCheckpoint("v", s)).toBeNull();
  });
  test("new story clears checkpoint", () => {
    const s = mem(); saveCheckpoint("u", story("a", 3) as any, 0, s); clearCheckpoint(s);
    expect(loadCheckpoint("u", s)).toBeNull();
  });
  test("resume window is 24h", () => {
    const s = mem(); saveCheckpoint("u", story("a", 3) as any, 0, s);
    const cp = loadCheckpoint("u", s);
    expect(isCheckpointFresh(cp, 23 * 3600e3)).toBe(true);
    expect(isCheckpointFresh(cp, 25 * 3600e3)).toBe(false);
  });
  test("bad scene index falls back to last valid scene", () => {
    expect(sanitize(story("a", 4, { currentSceneIndex: 9 }) as any).currentSceneIndex).toBe(3);
  });
});
