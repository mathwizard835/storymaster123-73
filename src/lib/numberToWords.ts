// Converts a number (0–999,999) to its English word representation
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function convertHundreds(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)];
    const o = ONES[n % 10];
    return o ? `${t}-${o}` : t;
  }
  const h = `${ONES[Math.floor(n / 100)]} hundred`;
  const rem = n % 100;
  return rem ? `${h} and ${convertHundreds(rem)}` : h;
}

export function numberToWords(n: number): string {
  if (n === 0) return 'zero';
  const thousands = Math.floor(n / 1000);
  const remainder = n % 1000;

  let result = '';
  if (thousands > 0) {
    result = `${convertHundreds(thousands)} thousand`;
  }
  if (remainder > 0) {
    if (thousands > 0 && remainder < 100) {
      result += ` and ${convertHundreds(remainder)}`;
    } else if (thousands > 0) {
      result += ` ${convertHundreds(remainder)}`;
    } else {
      result = convertHundreds(remainder);
    }
  }
  return result;
}

// Generate a random number between 100,000 and 999,999
export function generateChallengeNumber(): number {
  return Math.floor(Math.random() * 900_000) + 100_000;
}

// Normalize user input for comparison (lowercase, collapse whitespace, allow flexible "and"/hyphen usage)
export function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function checkAnswer(challengeNumber: number, userAnswer: string): boolean {
  const correct = numberToWords(challengeNumber);
  const normalized = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correct);

  // Exact match
  if (normalized === normalizedCorrect) return true;

  // Allow without hyphens
  if (normalized.replace(/-/g, ' ') === normalizedCorrect.replace(/-/g, ' ')) return true;

  // Allow without "and"
  const stripAnd = (s: string) => s.replace(/\band\b/g, '').replace(/\s+/g, ' ').trim();
  if (stripAnd(normalized) === stripAnd(normalizedCorrect)) return true;

  return false;
}
