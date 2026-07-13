/**
 * Score de comisión — PLACEHOLDER (mock).
 *
 * Genera una nota 1–5 determinística por comisión. NO viene del backend: el
 * cálculo real (promedio de las reviews de UTNTAC por materia-profesor) se
 * implementa en una spec futura. Marcado visualmente como provisorio ("mock").
 */

function mockScore(comisionId: number): number {
  const n = 1 + ((comisionId * 37) % 41) / 10; // 1.0 .. 5.0
  return Math.round(n * 10) / 10;
}

export function ScoreMock({
  comisionId,
  size = "sm",
}: {
  comisionId: number;
  size?: "sm" | "lg";
}) {
  const score = mockScore(comisionId);
  const lg = size === "lg";
  return (
    <span
      title="Puntaje provisorio (mock). Se calculará desde las reviews de UTNTAC en una feature futura."
      className={[
        "inline-flex shrink-0 items-center gap-1 rounded-lg border border-tertiary/25 bg-tertiary/15 font-semibold text-tertiary",
        lg ? "px-2.5 py-1.5 text-base" : "px-2 py-1 text-xs",
      ].join(" ")}
    >
      <span
        className={`material-symbols-outlined ${lg ? "text-[19px]" : "text-[15px]"}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        star
      </span>
      {score.toFixed(1)}
      <span
        className={`font-bold uppercase tracking-wider text-tertiary/70 ${
          lg ? "ml-1 text-[10px]" : "ml-0.5 text-[9px]"
        }`}
      >
        mock
      </span>
    </span>
  );
}
