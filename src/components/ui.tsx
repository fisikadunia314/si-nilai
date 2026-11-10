import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card p-5", className)}>{children}</div>;
}
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
export function Alert({ searchParams }: { searchParams?: { ok?: string; error?: string } }) {
  if (searchParams?.error) return <div className="alert-error">{searchParams.error}</div>;
  if (searchParams?.ok) return <div className="alert-ok">{searchParams.ok}</div>;
  return null;
}
export function Field({ label, required, children, hint }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 py-14 text-center">
      <p className="text-base font-semibold text-slate-600">{title}</p>
      {subtitle && <p className="max-w-md text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}
