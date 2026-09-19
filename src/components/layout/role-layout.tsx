"use client";

import { useAuth } from "@/lib/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RoleLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "ADMIN" | "PENGAJAR" | "SANTRI";
}) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (profile?.is_active === false || profile?.role !== role)) {
      router.push("/login");
    }
  }, [profile, loading, router, role]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (!profile || profile.is_active === false || profile.role !== role) {
    return null;
  }

  return <div className="p-4 lg:p-6">{children}</div>;
}
