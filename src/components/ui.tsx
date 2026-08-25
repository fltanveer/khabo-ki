import type { ComponentProps, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-5 ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const BUTTON_STYLES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-brand text-white hover:opacity-90",
  secondary: "border border-line bg-surface hover:bg-brand-soft",
  danger: "border border-line text-bad hover:bg-bad hover:text-white",
  ghost: "text-muted hover:text-ink",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_STYLES[variant]} ${className}`}
    />
  );
}

export function Input({ label, className = "", ...props }: ComponentProps<"input"> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium">{label}</span>}
      <input
        {...props}
        className={`w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand ${className}`}
      />
    </label>
  );
}

export function Select({ label, className = "", children, ...props }: ComponentProps<"select"> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium">{label}</span>}
      <select
        {...props}
        className={`w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand ${className}`}
      >
        {children}
      </select>
    </label>
  );
}

const BADGE_STYLES: Record<string, string> = {
  neutral: "bg-brand-soft text-ink",
  good: "bg-good/15 text-good",
  warn: "bg-warn/20 text-ink",
  bad: "bg-bad/15 text-bad",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE_STYLES; children: ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_STYLES[tone]}`}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-5 py-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function Notice({ tone = "bad", children }: { tone?: "bad" | "good"; children: ReactNode }) {
  if (!children) return null;
  const style = tone === "bad" ? "border-bad/40 bg-bad/10 text-bad" : "border-good/40 bg-good/10 text-good";
  return <p className={`rounded-lg border px-3 py-2 text-sm ${style}`}>{children}</p>;
}
