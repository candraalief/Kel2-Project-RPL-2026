import { redirect } from "next/navigation";
import { getSessionUser, type UserRole } from "./session";

export async function requireRole(role: UserRole) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(`/login/${role}`);
  }

  if (sessionUser.role !== role) {
    redirect(getDashboardPath(sessionUser.role));
  }

  return sessionUser;
}

export async function redirectLoggedInUser() {
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect(getDashboardPath(sessionUser.role));
  }
}

export function getDashboardPath(role: UserRole) {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "siswa") {
    return "/siswa";
  }

  return "/public";
}
