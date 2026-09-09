import {
  BookOpen,
  CalendarDays,
  Clock,
  Contact,
  ExternalLink,
  Network,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface Acceso {
  href: string;
  icon: LucideIcon;
  label: string;
  externo?: boolean;
}

// Un solo bloque de accesos (antes había dos widgets que se pisaban). Los
// destinos más usados que no están a un clic desde acá.
const ACCESOS: readonly Acceso[] = [
  { href: "/horarios", icon: Clock, label: "Horarios" },
  { href: "/materias", icon: Network, label: "Correlativas" },
  { href: "/calendario", icon: CalendarDays, label: "Calendario" },
  { href: "/profesores", icon: Contact, label: "Profesores" },
  { href: "/material", icon: BookOpen, label: "Material" },
  {
    href: "https://campus.frro.utn.edu.ar",
    icon: ExternalLink,
    label: "Campus",
    externo: true,
  },
] as const;

export function AccesosRow() {
  return (
    <div className="grid grid-cols-3 gap-3.5 sm:grid-cols-6">
      {ACCESOS.map((a) => {
        const inner = (
          <>
            <a.icon
              className="h-[22px] w-[22px] text-[var(--shell-accent-fg)] transition-transform group-hover:scale-110"
              strokeWidth={1.75}
            />
            <span className="font-body text-[11px] font-semibold text-[var(--shell-fg-muted)] transition-colors group-hover:text-[var(--shell-fg)]">
              {a.label}
            </span>
          </>
        );
        const cls =
          "group flex flex-col items-center gap-2 rounded-xl border border-[var(--shell-border)] bg-[var(--shell-panel)] px-2 py-4 text-center transition-colors hover:border-[#1CA4DF]/50";
        return a.externo ? (
          <a key={a.href} href={a.href} target="_blank" rel="noreferrer" className={cls}>
            {inner}
          </a>
        ) : (
          <Link key={a.href} href={a.href} className={cls}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
