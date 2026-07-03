import { Cpu, Play, SpinnerGap, TerminalWindow, WarningCircle } from "@phosphor-icons/react";

export function FortranExecution({
  busy,
  decodedProgram,
  wasmError,
  wasmMetrics,
  wasmOutput,
  wasmRunning,
  wasmStatus,
  onRun,
}) {
  return (
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
        <button className="compile-button" type="button" onClick={onRun} disabled={busy || wasmRunning}>
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
  );
}
