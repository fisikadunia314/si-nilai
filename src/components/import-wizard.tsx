"use client";
import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type RowResult = { rowNumber: number; nis: string; name: string; className: string | null; errors: string[]; skipped?: boolean };
type PreviewResult = { ok: boolean; message?: string; rows: RowResult[]; total: number; valid: number; invalid: number; duplicates: number };
type CommitResult = { ok: boolean; message?: string; inserted: number; skippedDuplicates: number; skippedInvalid: number; errors: Array<{ row: number; message: string }> };

export function ImportWizard({ schoolId }: { schoolId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<"preview" | "commit" | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [commit, setCommit] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const post = async (mode: "preview" | "commit") => {
    if (!file || !schoolId) return;
    setLoading(mode); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("schoolId", schoolId);
      const res = await fetch(`/api/siswa/import?mode=${mode}`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? "Terjadi kesalahan."); return; }
      if (mode === "preview") { setPreview(data); setCommit(null); } else { setCommit(data); }
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
        <FileSpreadsheet className="mx-auto mb-2 text-slate-400" size={36} />
        <p className="text-sm font-semibold text-slate-700">{file ? file.name : "Pilih file Excel (.xlsx)"}</p>
        <p className="mt-1 text-xs text-slate-400">Ukuran maksimal 5 MB. Baris pertama harus berisi header kolom.</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); setPreview(null); setCommit(null); setError(null); }} />
          <button type="button" className="btn-outline btn-sm" onClick={() => inputRef.current?.click()}>Pilih File…</button>
          <button type="button" className="btn-primary btn-sm" disabled={!file || loading !== null} onClick={() => post("preview")}>
            {loading === "preview" ? <><Loader2 size={14} className="animate-spin" /> Memeriksa…</> : <><Upload size={14} /> Pratinjau & Validasi</>}
          </button>
        </div>
      </div>

      {error && <div className="alert-error flex items-center gap-2"><AlertCircle size={16} />{error}</div>}

      {preview && !commit && (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-800">Hasil validasi: <span className="text-emerald-700">{preview.valid} valid</span> • <span className="text-amber-700">{preview.duplicates} duplikat (dilewati)</span> • <span className="text-red-700">{preview.invalid} bermasalah</span> — dari {preview.total} baris</p>
            <button className="btn-primary btn-sm" disabled={preview.valid === 0 || loading !== null} onClick={() => post("commit")}>
              {loading === "commit" ? <><Loader2 size={14} className="animate-spin" /> Mengimpor…</> : <>Impor {preview.valid} Siswa →</>}
            </button>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="table">
              <thead className="sticky top-0"><tr><th>Baris</th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Keterangan</th></tr></thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i} className={r.errors.length ? "bg-red-50/50" : r.skipped ? "bg-amber-50/50" : ""}>
                    <td>{r.rowNumber}</td><td className="font-mono text-xs">{r.nis || "-"}</td><td>{r.name || "-"}</td><td>{r.className ?? "-"}</td>
                    <td className="text-xs">{r.errors.length ? <span className="text-red-700">{r.errors.join("; ")}</span> : r.skipped ? <span className="text-amber-700">Duplikat — akan dilewati</span> : <span className="text-emerald-700">✓ Siap diimpor</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {commit && (
        <div className="card border-emerald-200 bg-emerald-50/50 p-5">
          <p className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={19} /> Impor selesai</p>
          <ul className="mt-2 text-sm text-emerald-900">
            <li>• <b>{commit.inserted}</b> siswa berhasil ditambahkan</li>
            <li>• {commit.skippedDuplicates} dilewati (NIS sudah ada)</li>
            <li>• {commit.skippedInvalid} dilewati (baris bermasalah)</li>
          </ul>
          {commit.errors.length > 0 && (
            <details className="mt-2 text-xs text-red-800"><summary className="cursor-pointer font-semibold">Detail {commit.errors.length} error</summary><ul className="mt-1 list-disc pl-5">{commit.errors.map((e, i) => <li key={i}>Baris {e.row}: {e.message}</li>)}</ul></details>
          )}
          <a href="/siswa" className="btn-primary btn-sm mt-3">Lihat Data Siswa →</a>
        </div>
      )}
    </div>
  );
}
