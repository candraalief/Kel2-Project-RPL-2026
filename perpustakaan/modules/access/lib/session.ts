import { cookies } from "next/headers";

export type UserRole = "admin" | "siswa" | "public";

export type SessionUser = {
  id: number;
  role: UserRole;
  name: string;
  identifier: string;
  className?: string;
};

const SESSION_COOKIE_NAME = "perpustakaan_session";

function encodeSession(session: SessionUser) {
  return Buffer.from(JSON.stringify(session), "utf-8").toString("base64url");
}

function decodeSession(value: string): SessionUser | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf-8")
    ) as SessionUser;

    if (
      !parsed ||
      (parsed.role !== "admin" &&
        parsed.role !== "siswa" &&
        parsed.role !== "public") ||
      typeof parsed.name !== "string" ||
      typeof parsed.identifier !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawCookie) {
    return null;
  }

  return decodeSession(rawCookie);
}

export async function createSession(session: SessionUser) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
