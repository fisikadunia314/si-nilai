import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { createUserAction, updateUserAction, deleteUserAction } from "@/server/actions";
import { PageHeader, Alert, Field, EmptyState } from "@/components/ui";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ROLE_LABEL, formatDate } from "@/lib/utils";
import { UserPlus, ChevronDown } from "lucide-react";

export const metadata: Metadata = { title: "Pengguna" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; sekolah?: string; q?: string }> }) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });
  const where: Record<string, unknown> = {};
  if (sp.sekolah) where.schoolId = sp.sekolah;
  if (sp.q) where.OR = [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }];
  const users = await prisma.user.findMany({ where, include: { school: true }, orderBy: [{ role: "asc" }, { name: "asc" }] });

  return (
    <div>
      <PageHeader title="Pengguna" subtitle="Kelola akun guru & admin. Admin bersifat global (semua sekolah), guru terikat ke satu sekolah." />
      <Alert searchParams={sp} />

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Form tambah */}
        <form action={createUserAction} className="card h-fit p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-slate-800"><UserPlus size={17} className="text-brand-600" /> Tambah Pengguna</h2>
          <input type="hidden" name="redirectTo" value="/users" />
          <div className="space-y-3">
            <Field label="Nama Lengkap" required><input name="name" required className="input" placeholder="Budi Santoso, S.Pd." /></Field>
            <Field label="Email" required><input name="email" type="email" required className="input" placeholder="budi@sekolah.sch.id" autoComplete="off" /></Field>
            <Field label="Password" required hint="Minimal 6 karakter"><input name="password" type="text" required className="input" placeholder="••••••" autoComplete="new-password" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Peran" required>
                <select name="role" className="input" defaultValue="GURU">
                  <option value="GURU">Guru Mapel</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </Field>
              <Field label="Sekolah" hint="Kosongkan utk admin">
                <select name="schoolId" className="input" defaultValue="">
                  <option value="">— Semua / Global —</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <button type="submit" className="btn-primary mt-4">Tambah Pengguna</button>
        </form>

        {/* Daftar */}
        <div className="xl:col-span-2">
          <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
            <input name="q" defaultValue={sp.q} className="input max-w-[220px]" placeholder="Cari nama / email…" />
            <select name="sekolah" defaultValue={sp.sekolah ?? ""} className="input w-auto">
              <option value="">Semua sekolah</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button type="submit" className="btn-outline btn-sm">Filter</button>
            <a href="/users" className="btn-ghost btn-sm">Reset</a>
          </form>

          {users.length === 0 ? <EmptyState title="Tidak ada pengguna" subtitle="Coba ubah filter, atau tambahkan pengguna baru." /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Nama</th><th>Peran</th><th>Sekolah</th><th>Status</th><th>Login terakhir</th><th></th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="align-top">
                      <td>
                        <p className="font-semibold text-slate-800">{u.name}{u.id === session.uid && <span className="ml-1 text-[10px] font-bold text-brand-600">(Anda)</span>}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                        {/* Edit inline */}
                        <details className="mt-1">
                          <summary className="inline-flex cursor-pointer select-none items-center gap-1 text-[11px] font-semibold text-brand-700">Edit <ChevronDown size={11} /></summary>
                          <form action={updateUserAction} className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="redirectTo" value="/users" />
                            <input name="name" defaultValue={u.name} className="input" required />
                            <input name="email" type="email" defaultValue={u.email} className="input" required />
                            <div className="grid grid-cols-2 gap-2">
                              <select name="role" defaultValue={u.role} className="input">
                                <option value="GURU">Guru Mapel</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                              <select name="schoolId" defaultValue={u.schoolId ?? ""} className="input">
                                <option value="">— Global —</option>
                                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            </div>
                            <input name="password" type="text" className="input" placeholder="Password baru (opsional)" autoComplete="new-password" />
                            <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" name="isActive" defaultChecked={u.isActive} className="h-4 w-4 accent-blue-600" /> Akun aktif</label>
                            <button type="submit" className="btn-primary btn-sm">Simpan</button>
                          </form>
                        </details>
                      </td>
                      <td><span className={u.role === "ADMIN" ? "badge-blue" : "badge-slate"}>{ROLE_LABEL[u.role]}</span></td>
                      <td className="max-w-[150px] truncate text-xs">{u.school?.name ?? "Semua sekolah"}</td>
                      <td>{u.isActive ? <span className="badge-green">Aktif</span> : <span className="badge-red">Nonaktif</span>}</td>
                      <td className="text-xs">{formatDate(u.lastLoginAt)}</td>
                      <td>
                        <form action={deleteUserAction}>
                          <input type="hidden" name="id" value={u.id} />
                          <ConfirmSubmit className="btn-ghost btn-sm !text-red-600" message={`Hapus akun ${u.name}?`}>Hapus</ConfirmSubmit>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
