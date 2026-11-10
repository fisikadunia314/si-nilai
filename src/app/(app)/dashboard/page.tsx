import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { SEMESTER_LABEL } from "@/lib/utils";
import { School, GraduationCap, Users, ClipboardList, ArrowRight, BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireUser();
  const isAdmin = session.role === "ADMIN";
  const schoolFilter = isAdmin ? {} : { schoolId: session.schoolId ?? "__none__" };

  const [schoolCount, studentCount, teacherCount, assignmentCount, activeYear] = await Promise.all([
    isAdmin ? prisma.school.count() : Promise.resolve(1),
    prisma.student.count({ where: schoolFilter }),
    isAdmin ? prisma.user.count({ where: { role: "GURU" } }) : prisma.user.count({ where: { role: "GURU", schoolId: session.schoolId } }),
    isAdmin ? prisma.teachingAssignment.count() : prisma.teachingAssignment.count({ where: { teacherId: session.uid } }),
    session.schoolId
      ? prisma.academicYear.findFirst({ where: { schoolId: session.schoolId, isActive: true }, include: { school: true } })
      : Promise.resolve(null),
  ]);

  const myAssignments = isAdmin
    ? await prisma.teachingAssignment.findMany({
        include: { school: true, classRoom: true, subject: true, teacher: true, academicYear: true, _count: { select: { components: true } } },
        orderBy: { createdAt: "desc" }, take: 6,
      })
    : await prisma.teachingAssignment.findMany({
        where: { teacherId: session.uid },
        include: { school: true, classRoom: true, subject: true, teacher: true, academicYear: true, _count: { select: { components: true } } },
        orderBy: { createdAt: "desc" }, take: 6,
      });

  const stats = [
    ...(isAdmin ? [{ label: "Sekolah", value: schoolCount, icon: School, color: "bg-brand-600" }] : []),
    { label: "Siswa", value: studentCount, icon: GraduationCap, color: "bg-emerald-600" },
    { label: "Guru Mapel", value: teacherCount, icon: Users, color: "bg-violet-600" },
    { label: isAdmin ? "Penugasan" : "Penugasan Saya", value: assignmentCount, icon: ClipboardList, color: "bg-amber-600" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Halo, {session.name.split(",")[0]} 👋</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin ? "Ringkasan seluruh sekolah yang terdaftar di SiNilai." : `Ringkasan sekolah Anda${session.schoolName ? ` — ${session.schoolName}` : ""}.`}
          {activeYear && <> Tahun ajaran aktif: <span className="font-semibold text-slate-700">{activeYear.year} Semester {SEMESTER_LABEL[activeYear.semester]}</span></>}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-4 p-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.color} text-white`}><s.icon size={22} /></div>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold leading-none text-slate-900">{s.value}</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-slate-800"><BookOpen size={17} className="text-brand-600" /> {isAdmin ? "Penugasan terbaru" : "Penugasan saya"}</h2>
          <Link href="/penugasan" className="flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline">Kelola <ArrowRight size={13} /></Link>
        </div>
        {myAssignments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Belum ada penugasan. {isAdmin ? "Buat lewat menu Penugasan Guru." : "Hubungi admin sekolah Anda."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr>{isAdmin && <th>Sekolah</th>}<th>Guru</th><th>Kelas</th><th>Mapel</th><th>TA</th><th>Komponen</th><th></th></tr></thead>
              <tbody>
                {myAssignments.map((a) => (
                  <tr key={a.id}>
                    {isAdmin && <td className="max-w-[160px] truncate">{a.school.name}</td>}
                    <td className="max-w-[160px] truncate">{a.teacher.name}</td>
                    <td className="whitespace-nowrap font-semibold">{a.classRoom.name}</td>
                    <td>{a.subject.name}</td>
                    <td className="whitespace-nowrap">{a.academicYear.year} · {SEMESTER_LABEL[a.academicYear.semester]}</td>
                    <td><span className="badge-blue">{a._count.components} komponen</span></td>
                    <td><Link href={`/penilaian/${a.id}`} className="text-xs font-bold text-brand-700 hover:underline">Input nilai →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
