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

export function ScoreMock({ comisionId }: { comisionId: number }) {
  const score = mockScore(comisionId);
  return (
    <span
      title="Puntaje provisorio (mock). Se calculará desde las reviews de UTNTAC en una feature futura."
      className="inline-flex items-center gap-1 rounded-lg bg-tertiary/15 border border-tertiary/25 px-2 py-1 text-xs font-semibold text-tertiary shrink-0"
    >
      <span
        className="material-symbols-outlined text-[15px]"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        star
      </span>
      {score.toFixed(1)}
      <span className="text-[9px] uppercase tracking-wider text-tertiary/70 font-bold ml-0.5">
        mock
      </span>
    </span>
  );
}
