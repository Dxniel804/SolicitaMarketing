import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, ChevronRight, Search } from "react-bootstrap-icons";

const GRADIENT_BG = [
  "radial-gradient(circle at 20% 20%, #658cff 0%, transparent 30%)",
  "radial-gradient(circle at 50% 10%, #a855f7 0%, transparent 35%)",
  "radial-gradient(circle at 75% 15%, #fb7185 0%, transparent 30%)",
  "radial-gradient(circle at 90% 5%, #fbbf24 0%, transparent 25%)",
  "#f8fafc",
].join(", ");

const WAVE_FILL = "#F5F7FB";

interface Crumb {
  label: string;
  href?: string;
}

export function GradientHero({
  breadcrumbs,
  title,
  subtitle,
  actions,
  illustration,
  illustrationClassName,
}: {
  breadcrumbs?: Crumb[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  illustration?: string;
  illustrationClassName?: string;
}) {
  return (
    <section
      className="relative -mx-8 -mt-8 mb-4 min-h-[340px] overflow-hidden px-14 pb-16 pt-6"
      style={{ background: GRADIENT_BG }}
    >
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64 w-full"
        viewBox="0 0 1440 260"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,190 C400,300 950,0 1440,130 L1440,260 L0,260 Z" fill={WAVE_FILL} />
      </svg>

      <div className="relative z-10 mb-10 flex items-center justify-end gap-3">
        <div className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm sm:flex">
          <Search size={14} className="text-vm-muted" />
          <span className="text-sm text-vm-muted">Pesquisar...</span>
        </div>
        <button
          aria-label="Notificações"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <Bell size={16} className="text-vm-ink" />
        </button>
      </div>

      <div className="relative z-10 flex items-start gap-4">
        <div className="max-w-xl">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-3 flex items-center gap-2 text-sm">
              {breadcrumbs.map((b, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight size={10} className="text-vm-muted" />}
                  {b.href ? (
                    <Link href={b.href} className="font-medium text-vm-primary">
                      {b.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-vm-ink">{b.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-5xl font-bold leading-tight text-vm-ink">{title}</h1>
          {subtitle && <p className="mt-5 text-lg text-vm-muted">{subtitle}</p>}
          {actions && <div className="mt-7 flex items-center gap-3">{actions}</div>}
        </div>

        {illustration && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={illustration}
            alt=""
            className={illustrationClassName ?? "hidden w-full max-w-2xl shrink-0 lg:block"}
          />
        )}
      </div>
    </section>
  );
}
