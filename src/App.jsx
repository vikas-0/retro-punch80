import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ControlStrip } from "./components/ControlStrip";
import { DeckOperations } from "./components/DeckOperations";
import { DeckTray } from "./components/DeckTray";
import { FortranExecution } from "./components/FortranExecution";
import { MachineCenter } from "./components/MachineCenter";
import { HelpModal, ProgramModal } from "./components/Modals";
import { OutputTerminal } from "./components/OutputTerminal";
import { RestoredOutput } from "./components/RestoredOutput";
import { Topbar } from "./components/Topbar";
import { SAMPLE_PROGRAM, SPEEDS, sleep } from "./constants";
import { useKeypunch } from "./hooks/useKeypunch";
import { compileAndRunFortran } from "./lfortranRuntime";
import { cardIsComplete, createDeck, decodeHoles, patternFor } from "./punchcard";
import { createSoundEngine } from "./sound";

export function App() {
  const [sourceDraft, setSourceDraft] = useState(SAMPLE_PROGRAM);
  const [deck, setDeck] = useState(() => createDeck(SAMPLE_PROGRAM, true));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scannerColumn, setScannerColumn] = useState(26);
  const [machineState, setMachineState] = useState("ready");
  const [status, setStatus] = useState("DECK LOADED · READY");
  const [decodedProgram, setDecodedProgram] = useState("");
  const [wasmStatus, setWasmStatus] = useState("COMPILER STANDBY");
  const [wasmOutput, setWasmOutput] = useState("");
  const [wasmMetrics, setWasmMetrics] = useState(null);
  const [wasmError, setWasmError] = useState("");
  const [wasmRunning, setWasmRunning] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [speed, setSpeed] = useState("medium");
  const [busy, setBusy] = useState(false);
  const [activePunch, setActivePunch] = useState(null);
  const [sounds] = useState(createSoundEngine);
  const cancelRef = useRef(false);
  const deckRef = useRef(deck);
  const punchSerialRef = useRef(0);

  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  useEffect(() => () => {
    cancelRef.current = true;
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) setReducedMotion(true);
  }, []);

  const card = deck[currentIndex] ?? createDeck("", false)[0];
  const decodedLine = useMemo(() => decodeHoles(card.holes), [card.holes]);
  const complete = useMemo(() => cardIsComplete(card), [card]);
  const completedCards = useMemo(() => deck.filter(cardIsComplete).length, [deck]);
  const completion = deck.length ? Math.round((completedCards / deck.length) * 100) : 0;

  const delay = useCallback(
    async (duration) => {
      await sleep(reducedMotion ? Math.min(duration, 2) : duration);
    },
    [reducedMotion],
  );

  const makeSound = useCallback(
    (name) => {
      if (soundOn) sounds[name]?.();
    },
    [soundOn, sounds],
  );

  const updateCard = useCallback((index, updater) => {
    setDeck((previous) => previous.map((item, itemIndex) => (itemIndex === index ? updater(item) : item)));
  }, []);

  const { keypunchMode, disarmKeypunch, toggleKeypunch } = useKeypunch({
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
  });

  const toggleHole = useCallback(
    (column, row) => {
      if (busy) return;
      updateCard(currentIndex, (item) => {
        const holes = new Set(item.holes);
        const key = `${column}:${row}`;
        if (holes.has(key)) holes.delete(key);
        else holes.add(key);
        return { ...item, holes, interpretation: "" };
      });
      setScannerColumn(column + 1);
      makeSound("punch");
      setStatus(`MANUAL PUNCH · COL ${String(column + 1).padStart(2, "0")} · ROW ${row}`);
    },
    [busy, currentIndex, makeSound, updateCard],
  );

  const loadCard = useCallback(
    async (index) => {
      disarmKeypunch();
      setMachineState("loading");
      setActivePunch(null);
      makeSound("feed");
      await delay(260);
      setCurrentIndex(index);
      setScannerColumn(1);
      setMachineState("ready");
      await delay(90);
    },
    [delay, disarmKeypunch, makeSound],
  );

  const punchCardAt = useCallback(
    async (index) => {
      const target = deckRef.current[index];
      if (!target) return;
      await loadCard(index);
      setMachineState("punching");
      setStatus(`PUNCHING CARD ${String(index + 1).padStart(2, "0")} OF ${deckRef.current.length}`);
      const length = Math.max(1, target.source.length);
      for (let column = 0; column < length; column += 1) {
        if (cancelRef.current) return;
        setScannerColumn(column + 1);
        const punches = patternFor(target.source[column] ?? " ");
        for (const row of punches) {
          if (cancelRef.current) return;
          const serial = punchSerialRef.current + 1;
          punchSerialRef.current = serial;
          setActivePunch({ column, row, serial });
          setStatus(
            `PUNCHING CARD ${String(index + 1).padStart(2, "0")} · COL ${String(column + 1).padStart(2, "0")} · ROW ${row}`,
          );
          updateCard(index, (item) => {
            const holes = new Set(item.holes);
            holes.add(`${column}:${row}`);
            return { ...item, holes };
          });
          makeSound("punch");
          await delay(SPEEDS[speed].strike);
        }
        setActivePunch(null);
        await delay(SPEEDS[speed].punch);
      }
      setActivePunch(null);
      setMachineState("verified");
      setStatus(`CARD ${String(index + 1).padStart(2, "0")} PUNCHED · VERIFIED`);
      makeSound("ready");
      await delay(180);
    },
    [delay, loadCard, makeSound, speed, updateCard],
  );

  const runPunch = useCallback(
    async (wholeDeck) => {
      if (busy) return;
      cancelRef.current = false;
      setBusy(true);
      const indices = wholeDeck ? deckRef.current.map((_, index) => index) : [currentIndex];
      for (const index of indices) {
        if (cancelRef.current) break;
        await punchCardAt(index);
      }
      setMachineState("ready");
      setActivePunch(null);
      setBusy(false);
      if (!cancelRef.current) setStatus(wholeDeck ? "FULL DECK PUNCHED · READY TO PLAY" : "CARD PUNCHED · READY TO READ");
    },
    [busy, currentIndex, punchCardAt],
  );

  const scanCardAt = useCallback(
    async (index) => {
      const target = deckRef.current[index];
      if (!target) return "";
      await loadCard(index);
      setMachineState("reading");
      setStatus(`READING CARD ${String(index + 1).padStart(2, "0")} OF ${deckRef.current.length}`);
      const scanLength = Math.max(8, target.source.length, decodeHoles(target.holes).length);
      for (let column = 0; column < Math.min(scanLength, 80); column += 1) {
        if (cancelRef.current) return "";
        setScannerColumn(column + 1);
        if (column % 3 === 0) makeSound("read");
        await delay(SPEEDS[speed].read);
      }
      const decoded = decodeHoles(deckRef.current[index].holes);
      setMachineState("verified");
      setStatus(`READ COMPLETE · ${decoded.length || 0} CHARACTERS`);
      makeSound("ready");
      await delay(180);
      return decoded;
    },
    [delay, loadCard, makeSound, speed],
  );

  const runRead = useCallback(
    async (wholeDeck) => {
      if (busy) return;
      cancelRef.current = false;
      setBusy(true);
      const indices = wholeDeck ? deckRef.current.map((_, index) => index) : [currentIndex];
      const lines = [];
      for (const index of indices) {
        if (cancelRef.current) break;
        lines.push(await scanCardAt(index));
      }
      if (!cancelRef.current) {
        const decoded = wholeDeck ? lines.join("\n") : lines[0];
        setDecodedProgram(decoded);
        setStatus(wholeDeck ? "DECK PLAYBACK COMPLETE · PROGRAM RESTORED" : "CARD READ · OUTPUT READY");
      }
      setMachineState("ready");
      setBusy(false);
    },
    [busy, currentIndex, scanCardAt],
  );

  const runInterpreter = useCallback(async () => {
    if (busy) return;
    disarmKeypunch();
    cancelRef.current = false;
    setBusy(true);
    setMachineState("printing");

    const decoded = decodeHoles(deckRef.current[currentIndex]?.holes || new Set());
    updateCard(currentIndex, (item) => ({ ...item, interpretation: "" }));
    setStatus(`INTERPRETING CARD ${String(currentIndex + 1).padStart(2, "0")} · PRINT HEAD READY`);

    for (let column = 0; column < Math.max(1, decoded.length); column += 1) {
      if (cancelRef.current) break;
      const character = decoded[column] || " ";
      setScannerColumn(column + 1);
      setStatus(
        `PRINTING CARD ${String(currentIndex + 1).padStart(2, "0")} · COL ${String(column + 1).padStart(2, "0")} · ${character === " " ? "SPACE" : `“${character}”`}`,
      );
      updateCard(currentIndex, (item) => ({
        ...item,
        interpretation: decoded.slice(0, column + 1),
      }));
      makeSound("print");
      await delay(SPEEDS[speed].print);
    }

    setMachineState("ready");
    setBusy(false);
    if (!cancelRef.current) {
      setStatus(`INTERPRETER PASS COMPLETE · ${decoded.length} CHARACTERS PRINTED`);
      makeSound("ready");
    }
  }, [busy, currentIndex, delay, disarmKeypunch, makeSound, speed, updateCard]);

  const runFortran = useCallback(async () => {
    if (busy || wasmRunning) return;
    const executableSource = decodedProgram.trim() ? decodedProgram : sourceDraft;
    if (!executableSource.trim()) {
      setWasmError("Load a Fortran program before starting the compiler.");
      setWasmStatus("NO SOURCE CODE");
      return;
    }

    setWasmRunning(true);
    setWasmError("");
    setWasmOutput("");
    setWasmMetrics(null);
    setStatus("WASM COMPILER ACTIVE");

    try {
      const result = await compileAndRunFortran(executableSource, setWasmStatus);
      setWasmOutput(result.output);
      setWasmMetrics(result);
      setWasmStatus("EXECUTION COMPLETE");
      setStatus("FORTRAN PROGRAM COMPLETE · OUTPUT CAPTURED");
      makeSound("ready");
    } catch (error) {
      setWasmError(error instanceof Error ? error.message : String(error));
      setWasmStatus("COMPILER ERROR");
      setStatus("FORTRAN COMPILER ERROR · CHECK EXECUTION BAY");
    } finally {
      setWasmRunning(false);
    }
  }, [busy, decodedProgram, makeSound, sourceDraft, wasmRunning]);

  const stopMachine = () => {
    cancelRef.current = true;
    disarmKeypunch();
    setBusy(false);
    setActivePunch(null);
    setMachineState("ready");
    setStatus("OPERATION PAUSED");
  };

  const ejectCard = async () => {
    if (busy) return;
    disarmKeypunch();
    setBusy(true);
    setMachineState("ejecting");
    setStatus("EJECTING CARD");
    makeSound("feed");
    await delay(420);
    setCurrentIndex((current) => (current + 1) % deck.length);
    setScannerColumn(1);
    setMachineState("loading");
    await delay(260);
    setMachineState("ready");
    setStatus("NEXT CARD LOADED · READY");
    setBusy(false);
  };

  const buildDeck = () => {
    disarmKeypunch();
    const nextDeck = createDeck(sourceDraft, false);
    setDeck(nextDeck);
    deckRef.current = nextDeck;
    setCurrentIndex(0);
    setScannerColumn(1);
    setDecodedProgram("");
    setWasmOutput("");
    setWasmError("");
    setWasmMetrics(null);
    setWasmStatus("COMPILER STANDBY");
    setMachineState("loading");
    setProgramOpen(false);
    setStatus(`${nextDeck.length} BLANK CARDS LOADED · PRESS PUNCH DECK`);
    makeSound("feed");
    window.setTimeout(() => setMachineState("ready"), reducedMotion ? 5 : 380);
  };

  const resetDeck = () => {
    if (busy) return;
    disarmKeypunch();
    const nextDeck = createDeck(sourceDraft, false);
    setDeck(nextDeck);
    deckRef.current = nextDeck;
    setCurrentIndex(0);
    setScannerColumn(1);
    setDecodedProgram("");
    setWasmOutput("");
    setWasmError("");
    setWasmMetrics(null);
    setWasmStatus("COMPILER STANDBY");
    setStatus("DECK CLEARED · READY TO PUNCH");
  };

  const downloadDeck = () => {
    const payload = {
      format: "PUNCH80-DECK/1",
      cards: deck.map((item) => ({
        sequence: item.sequence,
        source: item.source,
        holes: [...item.holes],
        interpretation: item.interpretation || "",
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "punch80-deck.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("DECK EXPORTED · JSON READY");
  };

  const cycleSpeed = () => {
    setSpeed((current) => (current === "slow" ? "medium" : current === "medium" ? "turbo" : "slow"));
  };

  const openProgram = () => {
    disarmKeypunch();
    setProgramOpen(true);
  };

  const openHelp = () => {
    disarmKeypunch();
    setHelpOpen(true);
  };

  return (
    <div className="app-shell">
      <Topbar
        currentIndex={currentIndex}
        deckSize={deck.length}
        completion={completion}
        soundOn={soundOn}
        onOpenProgram={openProgram}
        onToggleSound={() => setSoundOn((value) => !value)}
        onOpenHelp={openHelp}
      />

      <main className="console-body">
        <DeckTray
          deck={deck}
          currentIndex={currentIndex}
          busy={busy}
          onLoadCard={loadCard}
          onOpenProgram={openProgram}
        />
        <MachineCenter
          card={card}
          scannerColumn={scannerColumn}
          machineState={machineState}
          activePunch={activePunch}
          keypunchMode={keypunchMode}
          reducedMotion={reducedMotion}
          busy={busy}
          onToggleHole={toggleHole}
          onOpenProgram={openProgram}
          onPunchCard={() => runPunch(false)}
          onReadCard={() => runRead(false)}
          onToggleKeypunch={toggleKeypunch}
          onPrintCard={runInterpreter}
          onEjectCard={ejectCard}
        />
        <OutputTerminal
          decodedLine={decodedLine}
          scannerColumn={scannerColumn}
          source={card.source}
          complete={complete}
        />
      </main>

      <DeckOperations
        busy={busy}
        status={status}
        wasmRunning={wasmRunning}
        onStop={stopMachine}
        onPunchDeck={() => runPunch(true)}
        onPlayDeck={() => runRead(true)}
        onRunFortran={runFortran}
        onResetDeck={resetDeck}
        onDownloadDeck={downloadDeck}
      />

      <RestoredOutput decodedProgram={decodedProgram} />

      <FortranExecution
        busy={busy}
        decodedProgram={decodedProgram}
        wasmError={wasmError}
        wasmMetrics={wasmMetrics}
        wasmOutput={wasmOutput}
        wasmRunning={wasmRunning}
        wasmStatus={wasmStatus}
        onRun={runFortran}
      />

      <ControlStrip
        busy={busy}
        machineState={machineState}
        keypunchMode={keypunchMode}
        speed={speed}
        reducedMotion={reducedMotion}
        onCycleSpeed={cycleSpeed}
        onToggleReducedMotion={() => setReducedMotion((value) => !value)}
      />

      {programOpen && (
        <ProgramModal
          value={sourceDraft}
          onChange={setSourceDraft}
          onBuild={buildDeck}
          onClose={() => setProgramOpen(false)}
          onSample={() => setSourceDraft(SAMPLE_PROGRAM)}
        />
      )}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
