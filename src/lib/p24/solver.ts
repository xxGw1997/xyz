type Suit = "hearts" | "diamonds" | "clubs" | "spades";

interface Card {
  suit: Suit;
  value: number; // 1-13 (A=1, J=11, Q=12, K=13)
}

type Op = "+" | "-" | "*" | "/";

const OPERATORS: Op[] = ["+", "-", "*", "/"];
const EPSILON = 1e-6;
const TARGET = 24;

function applyOp(a: number, b: number, op: Op): number | null {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? null : a / b;
  }
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

interface SolutionStep {
  a: number;
  b: number;
  op: Op;
  result: number;
}

interface SolveResult {
  expression: string;
  steps: SolutionStep[];
}

function trySolve(values: number[]): SolveResult | null {
  const perms = permutations(values);

  for (const [a, b, c, d] of perms) {
    for (const op1 of OPERATORS) {
      for (const op2 of OPERATORS) {
        for (const op3 of OPERATORS) {
          // Pattern 1: ((a op1 b) op2 c) op3 d
          const r1 = applyOp(a, b, op1);
          if (r1 !== null) {
            const r2 = applyOp(r1, c, op2);
            if (r2 !== null) {
              const r3 = applyOp(r2, d, op3);
              if (r3 !== null && Math.abs(r3 - TARGET) < EPSILON) {
                return {
                  expression: `((${a} ${op1} ${b}) ${op2} ${c}) ${op3} ${d} = ${TARGET}`,
                  steps: [
                    { a, b, op: op1, result: r1 },
                    { a: r1, b: c, op: op2, result: r2 },
                    { a: r2, b: d, op: op3, result: r3 },
                  ],
                };
              }
            }
          }

          // Pattern 2: (a op1 (b op2 c)) op3 d
          const r4 = applyOp(b, c, op2);
          if (r4 !== null) {
            const r5 = applyOp(a, r4, op1);
            if (r5 !== null) {
              const r6 = applyOp(r5, d, op3);
              if (r6 !== null && Math.abs(r6 - TARGET) < EPSILON) {
                return {
                  expression: `(${a} ${op1} (${b} ${op2} ${c})) ${op3} ${d} = ${TARGET}`,
                  steps: [
                    { a: b, b: c, op: op2, result: r4 },
                    { a, b: r4, op: op1, result: r5 },
                    { a: r5, b: d, op: op3, result: r6 },
                  ],
                };
              }
            }
          }

          // Pattern 3: a op1 ((b op2 c) op3 d)
          const r7 = applyOp(b, c, op2);
          if (r7 !== null) {
            const r8 = applyOp(r7, d, op3);
            if (r8 !== null) {
              const r9 = applyOp(a, r8, op1);
              if (r9 !== null && Math.abs(r9 - TARGET) < EPSILON) {
                return {
                  expression: `${a} ${op1} ((${b} ${op2} ${c}) ${op3} ${d}) = ${TARGET}`,
                  steps: [
                    { a: b, b: c, op: op2, result: r7 },
                    { a: r7, b: d, op: op3, result: r8 },
                    { a, b: r8, op: op1, result: r9 },
                  ],
                };
              }
            }
          }

          // Pattern 4: a op1 (b op2 (c op3 d))
          const r10 = applyOp(c, d, op3);
          if (r10 !== null) {
            const r11 = applyOp(b, r10, op2);
            if (r11 !== null) {
              const r12 = applyOp(a, r11, op1);
              if (r12 !== null && Math.abs(r12 - TARGET) < EPSILON) {
                return {
                  expression: `${a} ${op1} (${b} ${op2} (${c} ${op3} ${d})) = ${TARGET}`,
                  steps: [
                    { a: c, b: d, op: op3, result: r10 },
                    { a: b, b: r10, op: op2, result: r11 },
                    { a, b: r11, op: op1, result: r12 },
                  ],
                };
              }
            }
          }

          // Pattern 5: (a op1 b) op2 (c op3 d)
          const r13 = applyOp(a, b, op1);
          const r14 = applyOp(c, d, op3);
          if (r13 !== null && r14 !== null) {
            const r15 = applyOp(r13, r14, op2);
            if (r15 !== null && Math.abs(r15 - TARGET) < EPSILON) {
              return {
                expression: `(${a} ${op1} ${b}) ${op2} (${c} ${op3} ${d}) = ${TARGET}`,
                steps: [
                  { a, b, op: op1, result: r13 },
                  { a: c, b: d, op: op3, result: r14 },
                  { a: r13, b: r14, op: op2, result: r15 },
                ],
              };
            }
          }
        }
      }
    }
  }

  return null;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= 13; value++) {
      deck.push({ suit, value });
    }
  }
  return deck;
}

function dealCards(count: number): Card[] {
  const deck = shuffleArray(createDeck());
  return deck.slice(0, count);
}

function getCardDisplayValue(value: number): string {
  switch (value) {
    case 1:
      return "A";
    case 11:
      return "J";
    case 12:
      return "Q";
    case 13:
      return "K";
    default:
      return String(value);
  }
}

function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
    case "spades":
      return "♠";
  }
}

function isRedSuit(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

export {
  type Card,
  type Suit,
  type Op,
  type SolveResult,
  type SolutionStep,
  trySolve,
  createDeck,
  dealCards,
  getCardDisplayValue,
  getSuitSymbol,
  isRedSuit,
  SUITS,
  TARGET,
};
