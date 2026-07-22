/** Pill que marca una comisión de materias electivas. */
export function ElectivaBadge({ size = "sm" }: { size?: "sm" | "lg" }) {
  const lg = size === "lg";
  return (
    <span
      title="Comisión de materias electivas"
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-secondary/25 bg-secondary/10 font-semibold text-secondary",
        lg ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[11px]",
      ].join(" ")}
    >
      <span className={`rounded-full bg-secondary ${lg ? "h-1.5 w-1.5" : "h-1 w-1"}`} />
      Electiva
    </span>
  );
}
