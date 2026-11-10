"use client";
import { useRouter } from "next/navigation";
export function SchoolAutoSelect({ schools, defaultValue, basePath, paramName = "sekolah" }: { schools: Array<{ id: string; name: string }>; defaultValue?: string; basePath: string; paramName?: string }) {
  const router = useRouter();
  return (
    <select className="input" defaultValue={defaultValue ?? ""} onChange={(e) => router.push(e.target.value ? `${basePath}?${paramName}=${e.target.value}` : basePath)}>
      <option value="">Pilih sekolah…</option>
      {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );
}
