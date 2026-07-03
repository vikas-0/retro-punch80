import { ArrowsClockwise, DownloadSimple, Hammer, Lightning, Pause, Play, SpinnerGap } from "@phosphor-icons/react";

export function DeckOperations({
  busy,
  status,
  wasmRunning,
  onStop,
  onPunchDeck,
  onPlayDeck,
  onRunFortran,
  onResetDeck,
  onDownloadDeck,
}) {
  return (
    <section className="deck-operations" aria-label="Deck operations">
      <div className="operation-status">
        <span className={`machine-pulse ${busy ? "busy" : ""}`} />
        <div><small>MACHINE STATUS</small><strong>{status}</strong></div>
      </div>
      <div className="operation-actions">
        {busy ? (
          <button className="stop" type="button" onClick={onStop}><Pause size={20} weight="fill" /> STOP</button>
        ) : (
          <>
            <button type="button" onClick={onPunchDeck}><Hammer size={20} weight="duotone" /> PUNCH DECK</button>
            <button className="play" type="button" onClick={onPlayDeck}><Play size={20} weight="fill" /> PLAY DECK</button>
          </>
        )}
        <button className="run-fortran" type="button" onClick={onRunFortran} disabled={busy || wasmRunning}>
          {wasmRunning ? <SpinnerGap className="spin" size={20} /> : <Lightning size={20} weight="fill" />}
          {wasmRunning ? "COMPILING" : "RUN FORTRAN"}
        </button>
        <button type="button" onClick={onResetDeck} disabled={busy}><ArrowsClockwise size={19} /> CLEAR</button>
        <button type="button" onClick={onDownloadDeck} disabled={busy}><DownloadSimple size={19} /> EXPORT</button>
      </div>
    </section>
  );
}
