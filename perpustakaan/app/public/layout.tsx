import type { ReactNode } from "react";
import { requirePublicSession } from "@/modules/access/lib/guards";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePublicSession();

  return children;
}
