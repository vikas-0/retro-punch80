import { ArrowsClockwise, Check } from "@phosphor-icons/react";

const SPEAKER_HOLES = Array.from({ length: 48 }, (_, index) => index);

export function OutputTerminal({ decodedLine, scannerColumn, source, complete }) {
  return (
    <aside className="output-terminal">
      <div className="panel-title"><span>OUTPUT TERMINAL</span><span>•••</span></div>
      <div className="terminal-screen">
        <span className="terminal-label">DECODED TEXT</span>
        <code>{decodedLine || "_"}</code>
        <div className="terminal-rule" />
        <span className="terminal-label">COLUMN</span>
        <strong>{String(scannerColumn).padStart(2, "0")}</strong>
        <small>{source[scannerColumn - 1] ? `CHAR “${source[scannerColumn - 1]}”` : "NO PUNCH"}</small>
      </div>
      <div className="verification-box">
        <span>{complete ? <Check size={16} weight="bold" /> : <ArrowsClockwise size={16} />}</span>
        <div>
          <strong>{complete ? "VERIFIED" : "INCOMPLETE"}</strong>
          <small>{complete ? "SOURCE MATCH" : "PUNCH CARD TO CONTINUE"}</small>
        </div>
      </div>
      <div className="terminal-speaker" aria-hidden="true">
        {SPEAKER_HOLES.map((index) => <span key={index} />)}
      </div>
    </aside>
  );
}
