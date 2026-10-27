import type { ComponentProps, ReactNode } from "react";
import { Tiffin } from "./Tiffin";

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
      className={`rounded-card bg-surface shadow-[var(--shadow-card)] ${padded ? "p-5 sm:p-6" : ""} ${className}`}
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[2.125rem] font-medium leading-[1.08] tracking-[-0.025em] text-balance sm:text-[2.5rem]">
          {title}
        </h1>
        {subtitle && <div className="mt-2 text-[0.95rem] text-muted">{subtitle}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
        <h2 className="font-display text-[1.25rem] font-medium tracking-[-0.01em]">{title}</h2>
        {aside}
      </div>
      {description && <p className="mb-3 text-sm leading-relaxed text-muted">{description}</p>}
      {children}
    </section>
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "accent" | "secondary" | "danger" | "destructive" | "ghost";
  size?: "md" | "sm";
  block?: boolean;
};

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  // Black on light, white on dark: the house primary. Turmeric is kept for
  // the single action a screen exists for (confirming lunch).
  primary: "bg-ink text-bg font-semibold hover:opacity-90",
  accent: "bg-brand text-on-brand font-semibold hover:brightness-[1.04]",
  secondary: "border border-line bg-surface text-ink hover:bg-raised",
  danger: "border border-bad/55 bg-transparent text-bad hover:bg-bad-soft",
  // The confirming step of something that can't be undone.
  destructive: "bg-bad text-bg font-semibold hover:opacity-90",
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
  // That goes for the small size too: on a phone it carries row actions like
  // Delete, where a mis-tap is expensive. It shrinks back on a real pointer.
  const sizing =
    size === "sm" ? "min-h-11 px-3.5 text-sm sm:min-h-9" : "min-h-12 px-5 text-[0.95rem] sm:min-h-11";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[transform,filter,background-color] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 ${sizing} ${
        BUTTON_VARIANTS[variant]
      } ${block ? "w-full" : ""} ${className}`}
    />
  );
}

const FIELD =
  "min-h-13 w-full rounded-[1.125rem] border border-line-strong bg-surface px-4 py-3 text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-faint focus:border-ink focus:ring-4 focus:ring-ink/10 sm:min-h-12";

export function Input({
  label,
  hint,
  className = "",
  ...props
}: ComponentProps<"input"> & { label?: string; hint?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-sm font-medium text-muted">{label}</span>}
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
      {label && <span className="mb-2 block text-sm font-medium text-muted">{label}</span>}
      <select {...props} className={`${FIELD} ${className}`}>
        {children}
      </select>
    </label>
  );
}

// Status reads as a 6px dot plus a label on a soft pill — never a solid
// saturated badge. The dot gives the state a shape, not only a colour.
const BADGE_TONES = {
  neutral: "bg-raised text-muted",
  brand: "bg-brand-soft text-brand-ink",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
} as const;

const BADGE_DOTS = {
  neutral: "bg-faint",
  brand: "bg-brand",
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
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
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-[1.7] ${BADGE_TONES[tone]}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${BADGE_DOTS[tone]}`} />
      {children}
    </span>
  );
}

// Empty screens are where the tiffin earns its place: a dead end becomes
// something with a face and a reason, not a grey box.
export function Empty({
  children,
  mood = "sleepy",
  quiet = false,
}: {
  children: ReactNode;
  mood?: "happy" | "waiting" | "sleepy" | "party";
  quiet?: boolean;
}) {
  return (
    <div className="flex flex-col items-center rounded-card bg-surface px-6 py-10 text-center shadow-[var(--shadow-card)]">
      {!quiet && <Tiffin mood={mood} className="mb-5 h-36 w-36" />}
      <div className="max-w-[34ch] text-[0.95rem] leading-relaxed text-muted">{children}</div>
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
    <p className={`rounded-2xl border px-4 py-3 text-sm ${tones[tone]}`} role="status">
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
    <li className={`flex min-h-16 flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6 ${className}`}>
      {children}
    </li>
  );
}
