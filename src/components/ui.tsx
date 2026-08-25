import type { ComponentProps, ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-surface ${padded ? "p-4 sm:p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[1.6rem] font-semibold leading-tight tracking-tight sm:text-2xl">
          {title}
        </h1>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function Section({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-7">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold sm:text-lg">{title}</h2>
        {aside}
      </div>
      {description && <p className="mb-3 text-sm leading-relaxed text-muted">{description}</p>}
      {children}
    </section>
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "md" | "sm";
  block?: boolean;
};

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-brand text-on-brand hover:opacity-90",
  secondary: "border border-line bg-surface text-ink hover:bg-raised",
  danger: "border border-bad/40 bg-transparent text-bad hover:bg-bad-soft",
  ghost: "text-muted hover:bg-raised hover:text-ink",
};

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
  ...props
}: ButtonProps) {
  // 44px minimum height on mobile — anything smaller is a miss-tap magnet.
  const sizing = size === "sm" ? "min-h-9 px-3 text-sm" : "min-h-11 px-4 text-sm sm:min-h-10";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 ${sizing} ${
        BUTTON_VARIANTS[variant]
      } ${block ? "w-full" : ""} ${className}`}
    />
  );
}

const FIELD =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/70 focus:border-brand";

export function Input({
  label,
  hint,
  className = "",
  ...props
}: ComponentProps<"input"> & { label?: string; hint?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium">{label}</span>}
      <input {...props} className={`${FIELD} ${className}`} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  className = "",
  children,
  ...props
}: ComponentProps<"select"> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium">{label}</span>}
      <select {...props} className={`${FIELD} ${className}`}>
        {children}
      </select>
    </label>
  );
}

const BADGE_TONES = {
  neutral: "bg-raised text-muted",
  brand: "bg-brand-soft text-brand",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
} as const;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-card border border-dashed border-line px-5 py-9 text-center text-sm leading-relaxed text-muted">
      {children}
    </div>
  );
}

export function Notice({
  tone = "bad",
  children,
}: {
  tone?: "bad" | "good" | "warn";
  children: ReactNode;
}) {
  if (!children) return null;
  const tones = {
    bad: "border-bad/35 bg-bad-soft text-bad",
    good: "border-good/35 bg-good-soft text-good",
    warn: "border-warn/35 bg-warn-soft text-ink",
  };
  return (
    <p className={`rounded-xl border px-3.5 py-2.5 text-sm ${tones[tone]}`} role="status">
      {children}
    </p>
  );
}

export function List({ children }: { children: ReactNode }) {
  return (
    <Card padded={false}>
      <ul className="divide-y divide-line">{children}</ul>
    </Card>
  );
}

export function Row({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 ${className}`}>
      {children}
    </li>
  );
}
