import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowsClockwise,
  Check,
  Cpu,
  DownloadSimple,
  Eject,
  FilePlus,
  FolderOpen,
  Gauge,
  GithubLogo,
  Hammer,
  Lightning,
  Pause,
  Play,
  Question,
  Scan,
  SpeakerHigh,
  SpeakerSlash,
  SpinnerGap,
  TerminalWindow,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { cardIsComplete, createDeck, decodeHoles, encodeLine, patternFor, ROWS } from "./punchcard";
import { compileAndRunFortran } from "./lfortranRuntime";
import { createSoundEngine } from "./sound";

const SAMPLE_PROGRAM = `program hello
  implicit none
  integer :: i
  do i = 1, 5
    print *, 'HELLO FROM CARD', i
  end do
end program hello`;

const SPEEDS = {
  slow: { label: "SLOW", punch: 72, read: 34 },
  medium: { label: "MEDIUM", punch: 34, read: 18 },
  turbo: { label: "TURBO", punch: 14, read: 8 },
};

const sleep = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

function PadIcon({ icon: Icon, size = 26 }) {
  return <Icon size={size} weight="duotone" aria-hidden="true" />;
}

function Indicator({ active, label, tone = "cyan" }) {
  return (
    <span className="indicator">
      <span className={`indicator-light ${tone} ${active ? "active" : ""}`} />
      {label}
    </span>
  );
}

function PunchCard({ card, scannerColumn, machineState, onToggleHole, reducedMotion }) {
  const columns = Array.from({ length: 80 }, (_, index) => index);

  return (
    <div
      className={`punch-card ${reducedMotion ? "reduced" : ""}`}
      aria-label={`Punch card ${card.sequence}, ${card.source || "blank line"}`}
    >
      <div className="card-heading">
        <span>PUNCH/80 · UNIVERSAL CODE CARD</span>
        <span>SEQ {String(card.sequence).padStart(3, "0")}</span>
      </div>

      <div className="column-numbers" aria-hidden="true">
        <span className="row-label" />
        <div className="column-number-grid">
          {columns.map((column) => (
            <span key={column} className={column + 1 === scannerColumn ? "current" : ""}>
              {column === 0 || (column + 1) % 5 === 0 ? column + 1 : "·"}
            </span>
          ))}
        </div>
      </div>

      <div className="hole-field">
        {ROWS.map((row) => (
          <div className="punch-row" key={row}>
            <span className="row-label">{row}</span>
            <div className="hole-grid">
              {columns.map((column) => {
                const active = card.holes.has(`${column}:${row}`);
                return (
                  <button
                    type="button"
                    tabIndex={-1}
                    key={`${column}:${row}`}
                    className={`hole ${active ? "punched" : ""} ${column + 1 === scannerColumn ? "scanned" : ""}`}
                    onClick={() => onToggleHole(column, row)}
                    aria-label={`${active ? "Unpunch" : "Punch"} row ${row}, column ${column + 1}`}
                    title={`Row ${row} · Column ${column + 1}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="card-footer">
        <span>{card.source || "BLANK CARD"}</span>
        <span>80 COL · ASCII EXTENDED</span>
      </div>

      <div
        className={`scan-beam ${machineState === "reading" ? "is-reading" : ""}`}
        style={{ "--column": scannerColumn }}
        aria-hidden="true"
      />
      {machineState === "punching" && (
        <div className="impact-ring" style={{ "--column": scannerColumn }} aria-hidden="true" />
      )}
    </div>
  );
}

function ProgramModal({ value, onChange, onBuild, onClose, onSample }) {
  const lines = value.replace(/\r/g, "").split("\n");
  const longest = Math.max(...lines.map((line) => line.length), 0);

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="program-modal" role="dialog" aria-modal="true" aria-labelledby="program-title">
        <header>
          <div>
            <p className="eyebrow">SOURCE BAY</p>
            <h2 id="program-title">Load a normal program</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close program editor">
            <X size={22} />
          </button>
        </header>
        <p className="modal-copy">
          Each line becomes one 80-column card. Classic letters and digits use Hollerith punches;
          punctuation and mixed case use a reversible extension.
        </p>
        <div className="editor-shell">
          <div className="line-numbers" aria-hidden="true">
            {lines.map((_, index) => (
              <span key={index}>{String(index + 1).padStart(2, "0")}</span>
            ))}
          </div>
          <textarea
            autoFocus
            value={value}
            onChange={(event) => onChange(event.target.value)}
            spellCheck="false"
            aria-label="Program source code"
          />
        </div>
        <div className="editor-stats">
          <span>{lines.length} CARDS</span>
          <span className={longest > 80 ? "warning" : ""}>LONGEST LINE {longest}/80</span>
          {longest > 80 && <span className="warning">EXTRA CHARACTERS WILL BE TRIMMED</span>}
        </div>
        <footer>
          <button className="secondary-button" type="button" onClick={onSample}>
            <FolderOpen size={18} weight="duotone" /> LOAD SAMPLE
          </button>
          <button className="primary-button" type="button" onClick={onBuild} disabled={!value.length}>
            <Hammer size={19} weight="duotone" /> BUILD BLANK DECK
          </button>
        </footer>
      </section>
    </div>
  );
}

function HelpModal({ onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <header>
          <div>
            <p className="eyebrow">OPERATOR MANUAL</p>
            <h2 id="help-title">Four moves. One tiny time machine.</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close help">
            <X size={22} />
          </button>
        </header>
        <ol className="help-steps">
          <li><strong>Load</strong><span>Paste a program. Every source line becomes a card.</span></li>
          <li><strong>Punch</strong><span>Punch one card or the whole deck while the head moves column by column.</span></li>
          <li><strong>Read</strong><span>Scan the current card and inspect its decoded line.</span></li>
          <li><strong>Play</strong><span>Feed the full deck through the reader to reconstruct the source.</span></li>
          <li><strong>Run</strong><span>Compile the restored Fortran deck to WebAssembly and execute it locally.</span></li>
        </ol>
        <button className="primary-button full" type="button" onClick={onClose}>READY TO OPERATE</button>
      </section>
    </div>
  );
}

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
  const [sounds] = useState(createSoundEngine);
  const cancelRef = useRef(false);
  const deckRef = useRef(deck);

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

  const toggleHole = useCallback(
    (column, row) => {
      if (busy) return;
      updateCard(currentIndex, (item) => {
        const holes = new Set(item.holes);
        const key = `${column}:${row}`;
        if (holes.has(key)) holes.delete(key);
        else holes.add(key);
        return { ...item, holes };
      });
      setScannerColumn(column + 1);
      makeSound("punch");
      setStatus(`MANUAL PUNCH · COL ${String(column + 1).padStart(2, "0")} · ROW ${row}`);
    },
    [busy, currentIndex, makeSound, updateCard],
  );

  const loadCard = useCallback(
    async (index) => {
      setMachineState("loading");
      makeSound("feed");
      await delay(260);
      setCurrentIndex(index);
      setScannerColumn(1);
      setMachineState("ready");
      await delay(90);
    },
    [delay, makeSound],
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
        if (punches.length) {
          updateCard(index, (item) => {
            const holes = new Set(item.holes);
            punches.forEach((row) => holes.add(`${column}:${row}`));
            return { ...item, holes };
          });
          makeSound("punch");
        }
        await delay(SPEEDS[speed].punch);
      }
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
    setBusy(false);
    setMachineState("ready");
    setStatus("OPERATION PAUSED");
  };

  const ejectCard = async () => {
    if (busy) return;
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand">PUNCH<span>/80</span></span>
          <span className="lab-label">NEON PUNCH LAB</span>
        </div>
        <div className="deck-readout">
          <span>DECK</span>
          <strong>{String(currentIndex + 1).padStart(2, "0")}</strong>
          <span>/ {String(deck.length).padStart(2, "0")}</span>
          <div className="deck-progress"><span style={{ width: `${completion}%` }} /></div>
        </div>
        <div className="top-actions">
          <button type="button" onClick={() => setProgramOpen(true)}>
            <FilePlus size={19} weight="duotone" /> PROGRAM INPUT
          </button>
          <button
            className={soundOn ? "active" : ""}
            type="button"
            onClick={() => setSoundOn((value) => !value)}
            aria-pressed={soundOn}
          >
            {soundOn ? <SpeakerHigh size={19} weight="duotone" /> : <SpeakerSlash size={19} weight="duotone" />}
            SOUND {soundOn ? "ON" : "OFF"}
          </button>
          <button className="help-button" type="button" onClick={() => setHelpOpen(true)} aria-label="Open help">
            <Question size={21} weight="duotone" />
          </button>
          <a
            className="github-link"
            href="https://github.com/vikas-0/retro-punch80"
            target="_blank"
            rel="noreferrer"
            aria-label="View PUNCH/80 on GitHub"
            title="View source on GitHub"
          >
            <GithubLogo size={21} weight="duotone" />
          </a>
        </div>
      </header>

      <main className="console-body">
        <aside className="deck-tray" aria-label="Punch card deck">
          <div className="panel-title"><span>DECK TRAY</span><span>•••</span></div>
          <div className="deck-list">
            {deck.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={`deck-card ${index === currentIndex ? "selected" : ""}`}
                onClick={() => !busy && loadCard(index)}
                aria-label={`Load card ${index + 1}: ${item.source || "blank"}`}
              >
                <span className="deck-number">{String(index + 1).padStart(2, "0")}</span>
                <span className={`mini-card ${cardIsComplete(item) ? "complete" : ""}`}>
                  <span>{item.source || "BLANK"}</span>
                </span>
                <span className={`deck-dot ${cardIsComplete(item) ? "complete" : ""}`} />
              </button>
            ))}
          </div>
          <button className="tray-action" type="button" onClick={() => setProgramOpen(true)} disabled={busy}>
            <FilePlus size={18} weight="duotone" /> LOAD PROGRAM
          </button>
        </aside>

        <section className="machine-center">
          <div className="reader-housing">
            <div className="reader-copy">
              <span>CARD READER / MODEL 80</span>
              <div>
                <Indicator active tone="lime" label="POWER" />
                <Indicator active={!busy} tone="lime" label="READY" />
                <Indicator active={machineState === "reading"} label="READ" />
              </div>
            </div>
            <div className="reader-rail">
              <div
                className={`reader-carriage ${machineState}`}
                style={{ "--column": scannerColumn }}
                aria-hidden="true"
              >
                <span /><span /><span /><span /><span />
              </div>
            </div>
          </div>

          <div className={`card-stage ${machineState}`}>
            <PunchCard
              card={card}
              scannerColumn={scannerColumn}
              machineState={machineState}
              onToggleHole={toggleHole}
              reducedMotion={reducedMotion}
            />
            <div className="feed-roller" aria-hidden="true">
              <span className="roller left" /><span className="roller-track" /><span className="roller right" />
            </div>
          </div>

          <div className="feed-position">
            <span>FEED POSITION</span>
            <div className="feed-scale"><span style={{ left: `${Math.max(0, ((scannerColumn - 1) / 79) * 100)}%` }} /></div>
            <strong>{String(scannerColumn).padStart(2, "0")}</strong>
          </div>

          <div className="command-rail">
            <button type="button" onClick={() => setProgramOpen(true)} disabled={busy}>
              <PadIcon icon={FilePlus} />
              <span><small>SOURCE</small>NEW DECK</span>
            </button>
            <button className="orange" type="button" onClick={() => runPunch(false)} disabled={busy}>
              <PadIcon icon={Hammer} />
              <span><small>CURRENT CARD</small>PUNCH</span>
            </button>
            <button type="button" onClick={() => runRead(false)} disabled={busy}>
              <PadIcon icon={Scan} />
              <span><small>DECODE CARD</small>READ</span>
            </button>
            <button className="orange" type="button" onClick={ejectCard} disabled={busy}>
              <PadIcon icon={Eject} />
              <span><small>NEXT CARD</small>EJECT</span>
            </button>
          </div>
        </section>

        <aside className="output-terminal">
          <div className="panel-title"><span>OUTPUT TERMINAL</span><span>•••</span></div>
          <div className="terminal-screen">
            <span className="terminal-label">DECODED TEXT</span>
            <code>{decodedLine || "_"}</code>
            <div className="terminal-rule" />
            <span className="terminal-label">COLUMN</span>
            <strong>{String(scannerColumn).padStart(2, "0")}</strong>
            <small>{card.source[scannerColumn - 1] ? `CHAR “${card.source[scannerColumn - 1]}”` : "NO PUNCH"}</small>
          </div>
          <div className="verification-box">
            <span>{complete ? <Check size={16} weight="bold" /> : <ArrowsClockwise size={16} />}</span>
            <div><strong>{complete ? "VERIFIED" : "INCOMPLETE"}</strong><small>{complete ? "SOURCE MATCH" : "PUNCH CARD TO CONTINUE"}</small></div>
          </div>
          <div className="terminal-speaker" aria-hidden="true">
            {Array.from({ length: 48 }, (_, index) => <span key={index} />)}
          </div>
        </aside>
      </main>

      <section className="deck-operations" aria-label="Deck operations">
        <div className="operation-status">
          <span className={`machine-pulse ${busy ? "busy" : ""}`} />
          <div><small>MACHINE STATUS</small><strong>{status}</strong></div>
        </div>
        <div className="operation-actions">
          {busy ? (
            <button className="stop" type="button" onClick={stopMachine}><Pause size={20} weight="fill" /> STOP</button>
          ) : (
            <>
              <button type="button" onClick={() => runPunch(true)}><Hammer size={20} weight="duotone" /> PUNCH DECK</button>
              <button className="play" type="button" onClick={() => runRead(true)}><Play size={20} weight="fill" /> PLAY DECK</button>
            </>
          )}
          <button className="run-fortran" type="button" onClick={runFortran} disabled={busy || wasmRunning}>
            {wasmRunning ? <SpinnerGap className="spin" size={20} /> : <Lightning size={20} weight="fill" />}
            {wasmRunning ? "COMPILING" : "RUN FORTRAN"}
          </button>
          <button type="button" onClick={resetDeck} disabled={busy}><ArrowsClockwise size={19} /> CLEAR</button>
          <button type="button" onClick={downloadDeck} disabled={busy}><DownloadSimple size={19} /> EXPORT</button>
        </div>
      </section>

      <section className="restored-output" aria-live="polite">
        <header>
          <div><span className="eyebrow">RECONSTRUCTED PROGRAM</span><strong>{decodedProgram ? "PLAYBACK CAPTURE" : "AWAITING DECK PLAYBACK"}</strong></div>
          <span>{decodedProgram ? `${decodedProgram.split("\n").length} CARDS READ` : "PRESS PLAY DECK"}</span>
        </header>
        <pre>{decodedProgram || "THE RESTORED PROGRAM WILL APPEAR HERE, LINE BY LINE."}</pre>
      </section>

      <section className={`fortran-execution ${wasmRunning ? "running" : ""} ${wasmError ? "error" : ""}`} aria-live="polite">
        <header className="fortran-header">
          <div className="fortran-title">
            <span className="compiler-icon"><Cpu size={24} weight="duotone" /></span>
            <div>
              <span className="eyebrow">WASM EXECUTION BAY</span>
              <strong>LFORTRAN LOCAL RUNTIME</strong>
            </div>
          </div>
          <div className="compiler-state">
            <span className={`compiler-light ${wasmRunning ? "active" : ""} ${wasmError ? "failed" : ""} ${wasmOutput && !wasmError ? "success" : ""}`} />
            <span>{wasmStatus}</span>
          </div>
          <button className="compile-button" type="button" onClick={runFortran} disabled={busy || wasmRunning}>
            {wasmRunning ? <SpinnerGap className="spin" size={20} /> : <Play size={18} weight="fill" />}
            {wasmRunning ? "COMPILING…" : `RUN ${decodedProgram ? "RESTORED DECK" : "SOURCE"}`}
          </button>
        </header>
        <div className="fortran-screen">
          <div className="terminal-gutter" aria-hidden="true">
            <TerminalWindow size={22} weight="duotone" />
            <span>STDOUT</span>
          </div>
          {wasmError ? (
            <div className="compiler-error" role="alert">
              <WarningCircle size={22} weight="duotone" />
              <pre>{wasmError}</pre>
            </div>
          ) : (
            <pre>{wasmOutput || (wasmRunning ? "LFortran is preparing the WebAssembly program…" : "FORTRAN OUTPUT WILL APPEAR HERE.")}</pre>
          )}
        </div>
        <footer className="fortran-metrics">
          <span>ENGINE <strong>{wasmMetrics?.version || "LFortran 0.52.0 · WASM"}</strong></span>
          <span>SOURCE <strong>{decodedProgram ? "RESTORED PUNCH DECK" : "PROGRAM INPUT"}</strong></span>
          {wasmMetrics && <span>COMPILE <strong>{wasmMetrics.compileMs.toFixed(1)} ms</strong></span>}
          {wasmMetrics && <span>EXECUTE <strong>{wasmMetrics.executionMs.toFixed(1)} ms</strong></span>}
          {wasmMetrics && <span>PROGRAM WASM <strong>{Math.ceil(wasmMetrics.wasmBytes / 1024)} KB</strong></span>}
          <span className="runtime-note">LOCAL ONLY · INTERACTIVE STDIN IS NOT ENABLED</span>
        </footer>
      </section>

      <footer className="control-strip">
        <div className="status-bank">
          <span>STATUS</span>
          <Indicator active tone="lime" label="POWER" />
          <Indicator active={!busy} tone="lime" label="READY" />
          <Indicator active={machineState === "punching"} tone="orange" label="PUNCH" />
          <Indicator active={machineState === "reading"} label="READ" />
          <Indicator active={machineState === "ejecting"} tone="orange" label="EJECT" />
        </div>
        <button className="speed-control" type="button" onClick={cycleSpeed} disabled={busy}>
          <Gauge size={18} weight="duotone" /> SPEED
          <span className="speed-bars" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => <i className={index < (speed === "slow" ? 3 : speed === "medium" ? 7 : 10) ? "on" : ""} key={index} />)}
          </span>
          <strong>{SPEEDS[speed].label}</strong>
        </button>
        <button
          className={`motion-control ${reducedMotion ? "active" : ""}`}
          type="button"
          onClick={() => setReducedMotion((value) => !value)}
          aria-pressed={reducedMotion}
        >
          REDUCED MOTION <span>{reducedMotion ? "ON" : "OFF"}</span>
        </button>
      </footer>

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
