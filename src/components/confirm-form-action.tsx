"use client";
import { ReactNode } from "react";
export function ConfirmFormAction({ message, formAction, className, title, children }: { message: string; formAction: (fd: FormData) => void; className?: string; title?: string; children: ReactNode }) {
  return (
    <button type="submit" formAction={formAction} className={className} title={title}
      onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
