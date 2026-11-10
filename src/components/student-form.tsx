import { Field } from "@/components/ui";
import { toDateInput } from "@/lib/utils";
import type { FieldDefinition } from "@prisma/client";

type Props = {
  action: (fd: FormData) => void;
  redirectTo: string;
  hiddenId?: string;
  schoolField: React.ReactNode; // select sekolah (admin) atau hidden input (guru/edit)
  classes: Array<{ id: string; name: string }>;
  defs: FieldDefinition[];
  defaults?: { nis?: string; nisn?: string | null; name?: string; gender?: string | null; birthPlace?: string | null; birthDate?: Date | null; status?: string; angkatan?: string | null; classRoomId?: string | null; extra?: Record<string, unknown> };
  submitLabel: string;
};

export function StudentForm({ action, redirectTo, hiddenId, schoolField, classes, defs, defaults, submitLabel }: Props) {
  const extra = (defaults?.extra ?? {}) as Record<string, unknown>;
  return (
    <form action={action} className="card space-y-4 p-6">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {hiddenId && <input type="hidden" name="id" value={hiddenId} />}
      <div className="grid gap-4 md:grid-cols-2">
        {schoolField}
        <Field label="Kelas / Rombel">
          <select name="classRoomId" defaultValue={defaults?.classRoomId ?? ""} className="input">
            <option value="">— Belum ditempatkan —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="NIS" required><input name="nis" required defaultValue={defaults?.nis} className="input" placeholder="24.011" /></Field>
        <Field label="NISN"><input name="nisn" defaultValue={defaults?.nisn ?? ""} className="input" placeholder="0098765432" inputMode="numeric" /></Field>
        <div className="md:col-span-2"><Field label="Nama Lengkap" required><input name="name" required defaultValue={defaults?.name} className="input" placeholder="Aditya Pratama" /></Field></div>
        <Field label="Jenis Kelamin">
          <select name="gender" defaultValue={defaults?.gender ?? ""} className="input">
            <option value="">— Pilih —</option>
            <option value="LAKI_LAKI">Laki-laki</option>
            <option value="PEREMPUAN">Perempuan</option>
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={defaults?.status ?? "ACTIVE"} className="input">
            <option value="ACTIVE">Aktif</option>
            <option value="GRADUATED">Lulus</option>
            <option value="MOVED_OUT">Pindah</option>
          </select>
        </Field>
        <Field label="Tempat Lahir"><input name="birthPlace" defaultValue={defaults?.birthPlace ?? ""} className="input" placeholder="Jakarta" /></Field>
        <Field label="Tanggal Lahir"><input name="birthDate" type="date" defaultValue={toDateInput(defaults?.birthDate)} className="input" /></Field>
        <Field label="Angkatan" hint="Tahun masuk, mis. 2024"><input name="angkatan" defaultValue={defaults?.angkatan ?? ""} className="input" placeholder="2024" inputMode="numeric" /></Field>
      </div>

      {defs.length > 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Biodata Tambahan</p>
          <div className="grid gap-4 md:grid-cols-2">
            {defs.map((d) => {
              const v = extra[d.key];
              const name = `extra:${d.key}`;
              if (d.type === "BOOLEAN") {
                return (
                  <label key={d.id} className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                    <input type="checkbox" name={name} defaultChecked={Boolean(v)} className="h-4 w-4 accent-blue-600" /> {d.label}
                  </label>
                );
              }
              if (d.type === "SELECT") {
                const options = Array.isArray(d.options) ? (d.options as string[]) : [];
                return (
                  <Field key={d.id} label={d.label} required={d.required}>
                    <select name={name} defaultValue={String(v ?? "")} className="input">
                      <option value="">— Pilih —</option>
                      {options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                );
              }
              const inputType = d.type === "NUMBER" ? "number" : d.type === "DATE" ? "date" : "text";
              return (
                <Field key={d.id} label={d.label} required={d.required}>
                  <input name={name} type={inputType} step="any" defaultValue={v == null ? "" : String(v)} className="input" />
                </Field>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
        <button type="submit" className="btn-primary">{submitLabel}</button>
        <a href="/siswa" className="btn-outline">Batal</a>
      </div>
    </form>
  );
}
