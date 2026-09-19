"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RoleLayout } from "@/components/layout/role-layout";
import { useAuth } from "@/lib/auth-provider";
import { createClient } from "@/lib/supabase/client";

function WaliSantriGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed" | "error">("checking");

  useEffect(() => {
    if (authLoading || !user) return;

    let active = true;
    const checkRelation = async () => {
      setStatus("checking");
      const supabase = createClient();
      const { count, error } = await supabase
        .from("wali_santri")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", user.id);

      if (!active) return;
      if (error) {
        setStatus("error");
        return;
      }

      if ((count ?? 0) === 0 && pathname !== "/orang-tua/anak") {
        router.replace("/orang-tua/anak");
        return;
      }

      setStatus("allowed");
    };

    void checkRelation();
    return () => {
      active = false;
    };
  }, [authLoading, pathname, router, user]);

  if (authLoading || status === "checking") {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive sm:p-12">
        Status data anak belum dapat diperiksa. Muat ulang halaman untuk mencoba lagi.
      </div>
    );
  }

  return <>{children}</>;
}

export default function OrangTuaLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleLayout role="SANTRI">
      <WaliSantriGuard>{children}</WaliSantriGuard>
    </RoleLayout>
  );
}
