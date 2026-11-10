import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/session";

/** Wajib login — redirect ke /login kalau belum. */
export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Wajib ADMIN — redirect ke dashboard kalau bukan admin. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireUser();
  if (session.role !== "ADMIN") redirect("/dashboard");
  return session;
}

/** Resolve schoolId yang efektif untuk query.
 *  ADMIN boleh lihat semua (kembalikan filter opsional dari parameter),
 *  GURU selalu dibatasi sekolahnya sendiri. */
export function effectiveSchoolId(session: SessionPayload, requested?: string | null): string | null | undefined {
  if (session.role === "ADMIN") return requested ?? undefined; // undefined = semua sekolah
  return session.schoolId;
}
