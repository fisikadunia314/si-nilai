import Link from "next/link";
import { getSession } from "@/lib/session";
import {
  LayoutDashboard, Users, School, BookOpen, GraduationCap, CalendarRange,
  ClipboardList, PenLine, ListChecks, Settings, LogOut, Building2, FileSpreadsheet,
} from "lucide-react";
import { logoutAction } from "@/server/actions";
import { ROLE_LABEL } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { title: "Utama", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Data Sekolah",
    items: [
      { href: "/siswa", label: "Data Siswa", icon: GraduationCap },
      { href: "/kelas", label: "Kelas / Rombel", icon: Building2 },
      { href: "/tahun-ajaran", label: "Tahun Ajaran", icon: CalendarRange },
      { href: "/mapel", label: "Mata Pelajaran", icon: BookOpen },
    ],
  },
  {
    title: "Penilaian",
    items: [
      { href: "/penugasan", label: "Penugasan Guru", icon: ClipboardList },
      { href: "/penilaian", label: "Input Nilai", icon: PenLine },
      { href: "/rekap", label: "Rekap & Leger", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Administrasi",
    items: [
      { href: "/sekolah", label: "Sekolah", icon: School, adminOnly: true },
      { href: "/users", label: "Pengguna", icon: Users, adminOnly: true },
      { href: "/field-biodata", label: "Field Biodata", icon: ListChecks, adminOnly: true },
      { href: "/pengaturan", label: "Pengaturan", icon: Settings },
    ],
  },
];

export async function Sidebar() {
  const session = await getSession();
  if (!session) return null;
  const isAdmin = session.role === "ADMIN";

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-slate-900 text-slate-200">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-xl">🎓</div>
        <div className="min-w-0">
          <p className="text-base font-extrabold leading-tight text-white">SiNilai</p>
          <p className="truncate text-[10px] uppercase tracking-widest text-slate-400">Nilai Multi-Sekolah</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group) => {
          const items = group.items.filter((i) => !i.adminOnly || isAdmin);
          if (items.length === 0) return null;
          return (
            <div key={group.title} className="mb-4">
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{group.title}</p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-300 transition hover:bg-white/5 hover:text-white">
                      <item.icon size={16} strokeWidth={2} className="text-slate-500" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-2 rounded-lg bg-white/5 px-3 py-2.5">
          <p className="truncate text-[13px] font-semibold text-white">{session.name}</p>
          <p className="truncate text-[11px] text-slate-400">{ROLE_LABEL[session.role] ?? session.role}{session.schoolName ? ` • ${session.schoolName}` : " • Semua sekolah"}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300">
            <LogOut size={16} /> Keluar
          </button>
        </form>
      </div>
    </aside>
  );
}
