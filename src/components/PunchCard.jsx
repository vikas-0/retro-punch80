import { ROWS } from "../punchcard";

const COLUMNS = Array.from({ length: 80 }, (_, index) => index);

export function PunchCard({ card, scannerColumn, machineState, onToggleHole, reducedMotion }) {
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
          {COLUMNS.map((column) => (
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
              {COLUMNS.map((column) => {
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
