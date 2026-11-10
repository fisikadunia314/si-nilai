import type { Metadata } from "next";
import { requireUser } from "@/lib/guards";
import { PageHeader, Alert, Field } from "@/components/ui";
import { changePasswordAction } from "@/server/actions";
import { ROLE_LABEL } from "@/lib/utils";
import { ShieldCheck, KeyRound } from "lucide-react";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function PengaturanPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const session = await requireUser();
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Pengaturan" subtitle="Profil akun dan keamanan." />
      <Alert searchParams={sp} />

      <div className="card mb-5 p-6">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800"><ShieldCheck size={18} className="text-brand-600" /> Profil</h2>
        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          <dt className="text-slate-400">Nama</dt><dd className="col-span-2 font-semibold">{session.name}</dd>
          <dt className="text-slate-400">Email</dt><dd className="col-span-2 font-mono text-xs">{session.email}</dd>
          <dt className="text-slate-400">Peran</dt><dd className="col-span-2">{ROLE_LABEL[session.role]}</dd>
          <dt className="text-slate-400">Sekolah</dt><dd className="col-span-2">{session.schoolName ?? "Semua sekolah (global)"}</dd>
        </dl>
      </div>

      <form action={changePasswordAction} className="card p-6">
        <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800"><KeyRound size={18} className="text-brand-600" /> Ganti Password</h2>
        <input type="hidden" name="redirectTo" value="/pengaturan" />
        <div className="space-y-3">
          <Field label="Password Saat Ini" required><input name="currentPassword" type="password" required className="input" autoComplete="current-password" /></Field>
          <Field label="Password Baru" required hint="Minimal 6 karakter"><input name="newPassword" type="password" required className="input" autoComplete="new-password" /></Field>
        </div>
        <button type="submit" className="btn-primary mt-4">Ubah Password</button>
      </form>
    </div>
  );
}
