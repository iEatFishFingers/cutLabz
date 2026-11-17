import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthCard from "@/components/account/AuthCard";
import SignupForm from "@/components/account/auth/SignupForm";
import { getViewer, safeNext } from "@/lib/customer/viewer";

export const metadata: Metadata = {
  title: "Create account | Cut Labz",
  robots: { index: false, follow: false },
};

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

export default function SignupPage({ searchParams }: { searchParams: SP }) {
  return (
    <AuthCard eyebrow="Account" title="Create account">
      <Suspense fallback={<SignupForm next="/account" />}>
        <Gate searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function Gate({ searchParams }: { searchParams: SP }) {
  const next = safeNext((await searchParams).next);
  if (await getViewer()) redirect(next);
  return <SignupForm next={next} />;
}
