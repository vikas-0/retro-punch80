export function Indicator({ active, label, tone = "cyan" }) {
  return (
    <span className="indicator">
      <span className={`indicator-light ${tone} ${active ? "active" : ""}`} />
      {label}
    </span>
  );
}
