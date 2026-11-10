"use client";
import { useMemo, useState } from "react";
import { Save, Loader2, CheckCircle2, TriangleAlert } from "lucide-react";
import { computeFinal, formatScore } from "@/lib/grade";
import { cn } from "@/lib/utils";

type Student = { id: string; nis: string; name: string };
type Component = { id: string; name: string; weight: number };

type Props = {
  assignmentId: string;
  kkm: number;
  students: Student[];
  components: Component[];
  initialScores: Record<string, Record<string, number | null>>;
};

export function Gradebook({ assignmentId, kkm, students, components, initialScores }: Props) {
  const [scores, setScores] = useState(initialScores);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weightOk = Math.abs(totalWeight - 100) < 0.001;

  const setCell = (studentId: string, componentId: string, raw: string) => {
    const value = raw.trim() === "" ? null : Math.min(100, Math.max(0, Number(raw.replace(",", "."))));
    setScores((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [componentId]: Number.isNaN(value as number) ? null : value } }));
  };

  const finals = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const st of students) {
      map[st.id] = computeFinal(
        components.map((c) => ({ value: scores[st.id]?.[c.id] ?? null })),
        components.map((c) => ({ weight: c.weight })),
      );
    }
    return map;
  }, [scores, students, components]);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const entries = students.flatMap((st) => components.map((c) => ({ studentId: st.id, componentId: c.id, value: scores[st.id]?.[c.id] ?? null })));
      const res = await fetch("/api/scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentId, entries }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message ?? "Gagal menyimpan."); return; }
      setSavedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan…</> : <><Save size={16} /> Simpan Nilai</>}
        </button>
        {savedAt && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} /> Tersimpan pukul {savedAt}</span>}
        {error && <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><TriangleAlert size={14} /> {error}</span>}
        {!weightOk && <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800"><TriangleAlert size={12} /> Total bobot {totalWeight} ≠ 100 — nilai akhir dinormalisasi otomatis</span>}
        <span className="ml-auto text-[11px] text-slate-400">Kosongkan sel untuk menghapus nilai. Batas 0–100.</span>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="w-10">No</th><th>NIS</th><th className="min-w-[180px]">Nama Siswa</th>
              {components.map((c) => <th key={c.id} className="text-center">{c.name}<br /><span className="text-[10px] font-medium normal-case text-slate-400">bobot {c.weight}</span></th>)}
              <th className="text-center bg-brand-50">Nilai Akhir</th>
              <th className="text-center">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st, i) => {
              const final = finals[st.id];
              const passed = final == null ? null : final >= kkm;
              return (
                <tr key={st.id}>
                  <td className="text-slate-400">{i + 1}</td>
                  <td className="font-mono text-xs">{st.nis}</td>
                  <td className="font-medium text-slate-800">{st.name}</td>
                  {components.map((c) => (
                    <td key={c.id} className="p-1.5 text-center">
                      <input
                        type="number" min={0} max={100} step="any" inputMode="decimal"
                        value={scores[st.id]?.[c.id] ?? ""}
                        onChange={(e) => setCell(st.id, c.id, e.target.value)}
                        aria-label={`${st.name} — ${c.name}`}
                        className="w-[4.5rem] rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-sm font-semibold outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </td>
                  ))}
                  <td className={cn("text-center text-base font-extrabold bg-brand-50/60", final != null && passed === false ? "text-red-600" : "text-slate-900")}>{formatScore(final)}</td>
                  <td className="text-center">{passed == null ? <span className="text-slate-300">—</span> : passed ? <span className="badge-green">Tuntas</span> : <span className="badge-red">Remedial</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? <><Loader2 size={16} className="animate-spin" /> Menyimpan…</> : <><Save size={16} /> Simpan Nilai</>}</button>
      </div>
    </div>
  );
}
