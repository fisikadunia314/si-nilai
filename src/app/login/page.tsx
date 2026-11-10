import type { Metadata } from "next";
import { loginAction } from "@/server/actions";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-brand-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-3xl shadow-lg">🎓</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">SiNilai</h1>
          <p className="mt-1 text-sm text-slate-400">Sistem Pengolahan Nilai Multi-Sekolah</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.06] p-6 shadow-2xl backdrop-blur">
          <h2 className="mb-4 text-lg font-bold text-white">Masuk ke akun Anda</h2>
          {sp.error && <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{sp.error}</div>}
          <form action={loginAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Email</label>
              <input id="email" name="email" type="email" required autoFocus autoComplete="email" placeholder="nama@sekolah.sch.id" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30" />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Password</label>
              <input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/30" />
            </div>
            <button type="submit" className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400">Masuk →</button>
          </form>
        </div>

        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">Akun Demo (dari seed)</p>
          <p className="mt-1 font-mono text-[11px] leading-5 text-amber-200/70">admin@sinilai.id / admin123 &nbsp;•&nbsp; guru@sinilai.id / guru123</p>
          <p className="mt-1 text-[10px] text-amber-200/50">Ganti password segera setelah deploy produksi.</p>
        </div>
      </div>
    </div>
  );
}
