import { Loader2, type LucideIcon } from 'lucide-react';

// סגנונות משותפים כדי שכל המסכים ייראו אחידים

export const inputClass =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 text-ink placeholder:text-ink-faint transition-colors hover:border-brand-200 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100';

export const labelClass = 'mb-1.5 block text-sm font-semibold text-ink';

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 py-3 font-semibold text-ink transition-colors hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50';

export const iconButton =
  'inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-line-soft hover:text-ink';

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 sm:p-7 print:border-none print:p-0 ${className}`}>
      {children}
    </section>
  );
}

export function PanelHeader({ icon: Icon, title, description, children }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{title}</h2>
          {description && <p className="mt-1 max-w-prose text-ink-soft">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function Spinner({ className = 'py-16' }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`} role="status" aria-label="טוען">
      <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-line px-6 py-12 text-center">
      <Icon className="mb-3 h-9 w-9 text-ink-faint" aria-hidden />
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border border-danger/20 bg-danger-50 px-4 py-3 text-sm font-medium text-danger">
      {children}
    </p>
  );
}

export function Modal({ title, subtitle, onClose, children }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/30 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={e => e.stopPropagation()}
        className="pb-safe w-full max-w-sm rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line-soft p-5">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className={iconButton} aria-label="סגירה">
            <span aria-hidden className="text-xl leading-none">×</span>
          </button>
        </div>
        <div className="space-y-5 p-5">{children}</div>
      </div>
    </div>
  );
}
