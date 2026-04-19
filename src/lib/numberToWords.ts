// Simple grown-up check: easy single-digit addition (e.g., "3 + 5 = ?")
// This replaces the old "type the number in words" challenge for a friendlier UX
// while still being too abstract for a typical 6–11 year old to instantly solve.

export interface SimpleChallenge {
  a: number;
  b: number;
  answer: number;
}

// Generate a simple addition challenge with two numbers between 2 and 9
// (sum will be 4–18 — easy for an adult, non-trivial for a young child).
export function generateSimpleChallenge(): SimpleChallenge {
  const a = Math.floor(Math.random() * 8) + 2; // 2..9
  const b = Math.floor(Math.random() * 8) + 2; // 2..9
  return { a, b, answer: a + b };
}

export function checkSimpleAnswer(challenge: SimpleChallenge, userAnswer: string): boolean {
  const trimmed = userAnswer.trim();
  if (!trimmed) return false;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return false;
  return num === challenge.answer;
}

// ---- Legacy exports (kept for backward compatibility, not used by simplified gate) ----

export function numberToWords(n: number): string {
  return String(n);
}

export function generateChallengeNumber(): number {
  return Math.floor(Math.random() * 900_000) + 100_000;
}

export function normalizeAnswer(input: string): string {
  return input.toLowerCase().trim();
}

export function checkAnswer(challengeNumber: number, userAnswer: string): boolean {
  return userAnswer.trim() === String(challengeNumber);
}
