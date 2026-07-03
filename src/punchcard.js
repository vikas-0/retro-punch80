export const ROWS = ["12", "11", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const hollerith = {
  " ": [],
  "0": ["0"],
  "1": ["1"],
  "2": ["2"],
  "3": ["3"],
  "4": ["4"],
  "5": ["5"],
  "6": ["6"],
  "7": ["7"],
  "8": ["8"],
  "9": ["9"],
};

"ABCDEFGHI".split("").forEach((character, index) => {
  hollerith[character] = ["12", String(index + 1)];
});

"JKLMNOPQR".split("").forEach((character, index) => {
  hollerith[character] = ["11", String(index + 1)];
});

"STUVWXYZ".split("").forEach((character, index) => {
  hollerith[character] = ["0", String(index + 2)];
});

const standardKeys = new Set(Object.keys(hollerith));

function binaryExtension(character) {
  const code = Math.min(character.codePointAt(0) ?? 32, 127);
  const punches = ["12", "11", "0"];
  for (let bit = 0; bit < 7; bit += 1) {
    if (code & (1 << bit)) punches.push(String(bit + 1));
  }
  return punches;
}

export function patternFor(character) {
  if (standardKeys.has(character)) return hollerith[character];
  return binaryExtension(character);
}

export function encodeLine(line) {
  const value = line.slice(0, 80).padEnd(80, " ");
  const holes = new Set();
  Array.from(value).forEach((character, column) => {
    patternFor(character).forEach((row) => holes.add(`${column}:${row}`));
  });
  return holes;
}

function decodePattern(pattern) {
  if (pattern.length === 0) return " ";

  const signature = [...pattern].sort((a, b) => ROWS.indexOf(a) - ROWS.indexOf(b)).join(":");
  for (const [character, rows] of Object.entries(hollerith)) {
    if (rows.join(":") === signature) return character;
  }

  if (pattern.includes("12") && pattern.includes("11") && pattern.includes("0")) {
    let code = 0;
    for (let bit = 0; bit < 7; bit += 1) {
      if (pattern.includes(String(bit + 1))) code |= 1 << bit;
    }
    if (code >= 32 && code <= 127) return String.fromCodePoint(code);
  }

  return "�";
}

export function decodeHoles(holes) {
  let output = "";
  for (let column = 0; column < 80; column += 1) {
    const pattern = ROWS.filter((row) => holes.has(`${column}:${row}`));
    output += decodePattern(pattern);
  }
  return output.replace(/\s+$/, "");
}

export function createDeck(source, filled = false) {
  const lines = source.replace(/\r/g, "").split("\n");
  return lines.slice(0, 50).map((line, index) => ({
    id: `${Date.now()}-${index}`,
    sequence: index + 1,
    source: line.slice(0, 80),
    holes: filled ? encodeLine(line) : new Set(),
  }));
}

export function cardIsComplete(card) {
  const target = encodeLine(card.source);
  if (target.size !== card.holes.size) return false;
  return [...target].every((hole) => card.holes.has(hole));
}
