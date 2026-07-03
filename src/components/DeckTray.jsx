import { FilePlus } from "@phosphor-icons/react";
import { cardIsComplete } from "../punchcard";

export function DeckTray({ deck, currentIndex, busy, onLoadCard, onOpenProgram }) {
  return (
    <aside className="deck-tray" aria-label="Punch card deck">
      <div className="panel-title"><span>DECK TRAY</span><span>•••</span></div>
      <div className="deck-list">
        {deck.map((card, index) => {
          const complete = cardIsComplete(card);
          return (
            <button
              type="button"
              key={card.id}
              className={`deck-card ${index === currentIndex ? "selected" : ""}`}
              onClick={() => !busy && onLoadCard(index)}
              aria-label={`Load card ${index + 1}: ${card.source || "blank"}`}
            >
              <span className="deck-number">{String(index + 1).padStart(2, "0")}</span>
              <span className={`mini-card ${complete ? "complete" : ""}`}>
                <span>{card.source || "BLANK"}</span>
              </span>
              <span className={`deck-dot ${complete ? "complete" : ""}`} />
            </button>
          );
        })}
      </div>
      <button className="tray-action" type="button" onClick={onOpenProgram} disabled={busy}>
        <FilePlus size={18} weight="duotone" /> LOAD PROGRAM
      </button>
    </aside>
  );
}
