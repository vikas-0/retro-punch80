import { useCallback, useEffect, useRef, useState } from "react";
import { SPEEDS } from "../constants";
import { patternFor } from "../punchcard";

export function useKeypunch({
  busy,
  currentIndex,
  scannerColumn,
  speed,
  delay,
  makeSound,
  updateCard,
  setActivePunch,
  setMachineState,
  setScannerColumn,
  setStatus,
}) {
  const [keypunchMode, setKeypunchMode] = useState(false);
  const currentIndexRef = useRef(currentIndex);
  const keypunchModeRef = useRef(keypunchMode);
  const keypunchColumnRef = useRef(scannerColumn);
  const generationRef = useRef(0);
  const queueRef = useRef(Promise.resolve());
  const serialRef = useRef(0);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    keypunchModeRef.current = keypunchMode;
  }, [keypunchMode]);

  const disarmKeypunch = useCallback((nextStatus) => {
    generationRef.current += 1;
    keypunchModeRef.current = false;
    setKeypunchMode(false);
    setActivePunch(null);
    setMachineState((current) => (current === "keypunch" ? "ready" : current));
    if (nextStatus) setStatus(nextStatus);
  }, [setActivePunch, setMachineState, setStatus]);

  const queueCharacter = useCallback(
    (character) => {
      const generation = generationRef.current;
      queueRef.current = queueRef.current.then(async () => {
        if (!keypunchModeRef.current || generation !== generationRef.current) return;

        const index = currentIndexRef.current;
        const columnNumber = keypunchColumnRef.current;
        if (columnNumber > 80) {
          disarmKeypunch("CARD FULL · KEYPUNCH DISARMED");
          makeSound("ready");
          return;
        }

        const column = columnNumber - 1;
        const punches = patternFor(character);
        setMachineState("keypunch");
        setScannerColumn(columnNumber);
        setStatus(`KEYPUNCH · COL ${String(columnNumber).padStart(2, "0")} · CHAR ${character === " " ? "SPACE" : `“${character}”`}`);

        updateCard(index, (card) => {
          const cardWasBlank = card.holes.size === 0;
          const holes = new Set([...card.holes].filter((hole) => !hole.startsWith(`${column}:`)));
          const characters = card.source.padEnd(80, " ").split("");
          characters[column] = character;
          const nextSource = cardWasBlank
            ? characters.slice(0, column + 1).join("")
            : characters.join("");
          return {
            ...card,
            source: nextSource.replace(/\s+$/, ""),
            holes,
            interpretation: (card.interpretation || "").slice(0, column),
          };
        });

        for (const row of punches) {
          if (!keypunchModeRef.current || generation !== generationRef.current) return;
          const serial = serialRef.current + 1;
          serialRef.current = serial;
          setActivePunch({ column, row, serial });
          updateCard(index, (card) => {
            const holes = new Set(card.holes);
            holes.add(`${column}:${row}`);
            return { ...card, holes };
          });
          makeSound("punch");
          await delay(SPEEDS[speed].strike);
        }

        setActivePunch(null);
        const nextColumn = columnNumber + 1;
        keypunchColumnRef.current = nextColumn;
        setScannerColumn(Math.min(nextColumn, 80));
        setStatus(nextColumn > 80
          ? "CARD FULL · PRESS KEYPUNCH TO EXIT"
          : `KEYPUNCH ARMED · NEXT COLUMN ${String(nextColumn).padStart(2, "0")}`);
      });
    },
    [delay, disarmKeypunch, makeSound, setActivePunch, setMachineState, setScannerColumn, setStatus, speed, updateCard],
  );

  const toggleKeypunch = useCallback(() => {
    if (busy) return;
    if (keypunchModeRef.current) {
      disarmKeypunch("KEYPUNCH DISARMED · READY");
      return;
    }

    generationRef.current += 1;
    keypunchModeRef.current = true;
    keypunchColumnRef.current = scannerColumn;
    setKeypunchMode(true);
    setMachineState("keypunch");
    setStatus(`KEYPUNCH ARMED · TYPE AT COLUMN ${String(scannerColumn).padStart(2, "0")} · ESC TO EXIT`);
    makeSound("ready");
  }, [busy, disarmKeypunch, makeSound, scannerColumn, setMachineState, setStatus]);

  useEffect(() => {
    if (!keypunchMode) return undefined;

    const handleKeyDown = (event) => {
      const target = event.target;
      const isEditable = target instanceof HTMLElement
        && (target.isContentEditable || ["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (isEditable || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "Escape") {
        event.preventDefault();
        disarmKeypunch("KEYPUNCH DISARMED · READY");
        return;
      }

      if (event.key.length !== 1) return;
      event.preventDefault();
      queueCharacter(event.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disarmKeypunch, keypunchMode, queueCharacter]);

  return { keypunchMode, disarmKeypunch, toggleKeypunch };
}
