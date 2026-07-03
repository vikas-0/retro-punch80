import { Gauge } from "@phosphor-icons/react";
import { SPEEDS } from "../constants";
import { Indicator } from "./Indicator";

export function ControlStrip({ busy, machineState, keypunchMode, speed, reducedMotion, onCycleSpeed, onToggleReducedMotion }) {
  const activeSpeedBars = speed === "slow" ? 3 : speed === "medium" ? 7 : 10;

  return (
    <footer className="control-strip">
      <div className="status-bank">
        <span>STATUS</span>
        <Indicator active tone="lime" label="POWER" />
        <Indicator active={!busy} tone="lime" label="READY" />
        <Indicator active={machineState === "punching" || machineState === "keypunch"} tone="orange" label="PUNCH" />
        <Indicator active={keypunchMode} tone="orange" label="KEY" />
        <Indicator active={machineState === "reading"} label="READ" />
        <Indicator active={machineState === "printing"} tone="orange" label="PRINT" />
        <Indicator active={machineState === "ejecting"} tone="orange" label="EJECT" />
      </div>
      <button className="speed-control" type="button" onClick={onCycleSpeed} disabled={busy}>
        <Gauge size={18} weight="duotone" /> SPEED
        <span className="speed-bars" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => <i className={index < activeSpeedBars ? "on" : ""} key={index} />)}
        </span>
        <strong>{SPEEDS[speed].label}</strong>
      </button>
      <button
        className={`motion-control ${reducedMotion ? "active" : ""}`}
        type="button"
        onClick={onToggleReducedMotion}
        aria-pressed={reducedMotion}
      >
        REDUCED MOTION <span>{reducedMotion ? "ON" : "OFF"}</span>
      </button>
    </footer>
  );
}
