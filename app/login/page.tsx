import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthCard from "@/components/account/AuthCard";
import LoginForm from "@/components/account/auth/LoginForm";
import { getViewer, safeNext } from "@/lib/customer/viewer";

export const metadata: Metadata = {
  title: "Sign in | Cut Labz",
  robots: { index: false, follow: false },
};

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

export default function LoginPage({ searchParams }: { searchParams: SP }) {
  return (
    <AuthCard eyebrow="Account" title="Sign in">
      <Suspense fallback={<LoginForm next="/account" placeholder />}>
        <Gate searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function Gate({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getViewer()) redirect(next);
  return (
    <LoginForm
      next={next}
      notice={sp.deleted === "1" ? "Your account has been deleted." : undefined}
      initialError={sp.error === "link" ? "That link has expired. Sign in or request a new one." : undefined}
    />
  );
}
