import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin Login | Cut Labz",
  robots: { index: false, follow: false },
};

export default function LoginPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  return (
    <div className="bg-black text-white font-sans tracking-tight min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 p-6 sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Admin</p>
        <h1 className="text-2xl font-semibold mt-1 mb-8">Cut Labz</h1>
        <Suspense fallback={<LoginForm />}>
          <LoginGate searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function LoginGate({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const db = await createSupabaseServerClient();
  const { data } = await db.auth.getUser();
  if (data?.user) {
    const { data: row } = await db
      .from("admins")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (row) redirect("/admin");
  }
  const notAdmin = sp.error === "not-admin";
  return (
    <LoginForm
      key={notAdmin ? "na" : "ok"}
      initialError={notAdmin ? "This account doesn't have admin access." : undefined}
    />
  );
}
