import { Eject, FilePlus, Hammer, Scan } from "@phosphor-icons/react";
import { Indicator } from "./Indicator";
import { PunchCard } from "./PunchCard";

function CommandIcon({ icon: Icon, size = 26 }) {
  return <Icon size={size} weight="duotone" aria-hidden="true" />;
}

export function MachineCenter({
  card,
  scannerColumn,
  machineState,
  activePunch,
  reducedMotion,
  busy,
  onToggleHole,
  onOpenProgram,
  onPunchCard,
  onReadCard,
  onEjectCard,
}) {
  const feedPosition = Math.max(0, ((scannerColumn - 1) / 79) * 100);

  return (
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
          <div className={`reader-carriage ${machineState}`} style={{ "--column": scannerColumn }} aria-hidden="true">
            <span /><span /><span /><span /><span />
          </div>
        </div>
      </div>

      <div className={`card-stage ${machineState}`}>
        <PunchCard
          card={card}
          scannerColumn={scannerColumn}
          machineState={machineState}
          activePunch={activePunch}
          onToggleHole={onToggleHole}
          reducedMotion={reducedMotion}
        />
        <div className="feed-roller" aria-hidden="true">
          <span className="roller left" /><span className="roller-track" /><span className="roller right" />
        </div>
      </div>

      <div className="feed-position">
        <span>FEED POSITION</span>
        <div className="feed-scale"><span style={{ left: `${feedPosition}%` }} /></div>
        <strong>{String(scannerColumn).padStart(2, "0")}</strong>
      </div>

      <div className="command-rail">
        <button type="button" onClick={onOpenProgram} disabled={busy}>
          <CommandIcon icon={FilePlus} />
          <span><small>SOURCE</small>NEW DECK</span>
        </button>
        <button className="orange" type="button" onClick={onPunchCard} disabled={busy}>
          <CommandIcon icon={Hammer} />
          <span><small>CURRENT CARD</small>PUNCH</span>
        </button>
        <button type="button" onClick={onReadCard} disabled={busy}>
          <CommandIcon icon={Scan} />
          <span><small>DECODE CARD</small>READ</span>
        </button>
        <button className="orange" type="button" onClick={onEjectCard} disabled={busy}>
          <CommandIcon icon={Eject} />
          <span><small>NEXT CARD</small>EJECT</span>
        </button>
      </div>
    </section>
  );
}
