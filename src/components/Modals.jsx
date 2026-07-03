import { FolderOpen, Hammer, X } from "@phosphor-icons/react";

export function ProgramModal({ value, onChange, onBuild, onClose, onSample }) {
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

export function HelpModal({ onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <header>
          <div>
            <p className="eyebrow">OPERATOR MANUAL</p>
            <h2 id="help-title">Seven moves. One tiny time machine.</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close help">
            <X size={22} />
          </button>
        </header>
        <ol className="help-steps">
          <li><strong>Load</strong><span>Paste a program. Every source line becomes a card.</span></li>
          <li><strong>Punch</strong><span>Punch one card or the whole deck while the head moves column by column.</span></li>
          <li><strong>Keypunch</strong><span>Arm the keyboard, type directly onto the current card, and press Escape when finished.</span></li>
          <li><strong>Read</strong><span>Scan the current card and inspect its decoded line.</span></li>
          <li><strong>Interpret</strong><span>Print the text decoded from the holes across the top edge of the card.</span></li>
          <li><strong>Play</strong><span>Feed the full deck through the reader to reconstruct the source.</span></li>
          <li><strong>Run</strong><span>Compile the restored Fortran deck to WebAssembly and execute it locally.</span></li>
        </ol>
        <button className="primary-button full" type="button" onClick={onClose}>READY TO OPERATE</button>
      </section>
    </div>
  );
}
