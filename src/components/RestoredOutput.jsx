export function RestoredOutput({ decodedProgram }) {
  const cardCount = decodedProgram ? decodedProgram.split("\n").length : 0;

  return (
    <section className="restored-output" aria-live="polite">
      <header>
        <div>
          <span className="eyebrow">RECONSTRUCTED PROGRAM</span>
          <strong>{decodedProgram ? "PLAYBACK CAPTURE" : "AWAITING DECK PLAYBACK"}</strong>
        </div>
        <span>{decodedProgram ? `${cardCount} CARDS READ` : "PRESS PLAY DECK"}</span>
      </header>
      <pre>{decodedProgram || "THE RESTORED PROGRAM WILL APPEAR HERE, LINE BY LINE."}</pre>
    </section>
  );
}
