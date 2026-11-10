import type { Metadata } from "next";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ImportWizard } from "@/components/import-wizard";
import { SchoolAutoSelect } from "@/components/school-select";
import { FileDown, Info } from "lucide-react";

export const metadata: Metadata = { title: "Import Siswa" };

export default async function ImportSiswaPage({ searchParams }: { searchParams: Promise<{ sekolah?: string }> }) {
  const session = await requireAdmin();
  const sp = await searchParams;
  const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });
  const schoolId = sp.sekolah ?? schools[0]?.id ?? "";
  const defs = schoolId ? await prisma.fieldDefinition.findMany({ where: { entity: "STUDENT", isActive: true, OR: [{ schoolId: null }, { schoolId }] }, orderBy: { order: "asc" } }) : [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Import Siswa dari Excel"
        subtitle="Unggah file .xlsx — sistem memvalidasi dulu (NIS, format tanggal, kelas) sebelum menulis ke database."
        action={<a href={`/api/siswa/template${schoolId ? `?sekolah=${schoolId}` : ""}`} className="btn-outline btn-sm"><FileDown size={15} /> Download Template</a>}
      />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
        <Info size={15} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">Kolom template: NIS*, NISN, Nama Lengkap*, Jenis Kelamin (L/P), Tempat Lahir, Tanggal Lahir (DD/MM/YYYY), Kelas, Angkatan, Status.</p>
          <p className="mt-1">Kolom tambahan biodata custom yang aktif akan dikenali otomatis berdasarkan nama kolomnya di template. Kelas harus sudah dibuat di menu Kelas — pencocokan nama tidak case-sensitive. NIS yang sudah ada di sekolah yang sama akan dilewati (tidak ditimpa).</p>
          {defs.length > 0 && <p className="mt-1">Field biodata aktif: {defs.map((d) => d.label).join(", ")}.</p>}
        </div>
      </div>
      <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
        <span className="font-semibold">Sekolah tujuan:</span>
        <SchoolAutoSelect schools={schools} defaultValue={schoolId} basePath="/siswa/import" />
      </div>
      {schoolId && <ImportWizard schoolId={schoolId} />}
    </div>
  );
}
