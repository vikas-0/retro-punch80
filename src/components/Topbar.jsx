import { FilePlus, GithubLogo, Question, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";

export function Topbar({ currentIndex, deckSize, completion, soundOn, onOpenProgram, onToggleSound, onOpenHelp }) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <span className="brand">PUNCH<span>/80</span></span>
        <span className="lab-label">NEON PUNCH LAB</span>
      </div>
      <div className="deck-readout">
        <span>DECK</span>
        <strong>{String(currentIndex + 1).padStart(2, "0")}</strong>
        <span>/ {String(deckSize).padStart(2, "0")}</span>
        <div className="deck-progress"><span style={{ width: `${completion}%` }} /></div>
      </div>
      <div className="top-actions">
        <button type="button" onClick={onOpenProgram}>
          <FilePlus size={19} weight="duotone" /> PROGRAM INPUT
        </button>
        <button className={soundOn ? "active" : ""} type="button" onClick={onToggleSound} aria-pressed={soundOn}>
          {soundOn ? <SpeakerHigh size={19} weight="duotone" /> : <SpeakerSlash size={19} weight="duotone" />}
          SOUND {soundOn ? "ON" : "OFF"}
        </button>
        <button className="help-button" type="button" onClick={onOpenHelp} aria-label="Open help">
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
  );
}
