import Link from "next/link";

import type { CentroOut } from "@/lib/types";

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
        active
          ? "border-[#1CA4DF]/30 bg-[#1CA4DF]/10 text-[var(--shell-accent-fg)]"
          : "border-[var(--shell-border)] text-[var(--shell-fg-muted)] hover:border-[var(--shell-border)] hover:text-[var(--shell-fg)]",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export function FiltroFuentes({
  centros,
  activo,
}: {
  centros: CentroOut[];
  activo?: string;
}) {
  if (centros.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <Chip href="/novedades" active={!activo}>
        Todas
      </Chip>
      {centros.map((c) => (
        <Chip key={c.handle} href={`/novedades?centro=${c.handle}`} active={activo === c.handle}>
          {c.logo_url && (
            <span className="flex h-4 w-4 shrink-0 overflow-hidden rounded-full bg-[var(--shell-hover)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.logo_url} alt="" className="h-full w-full object-cover" />
            </span>
          )}
          {c.nombre}
        </Chip>
      ))}
    </div>
  );
}
