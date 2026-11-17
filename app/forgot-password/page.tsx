import type { Metadata } from "next";
import AuthCard from "@/components/account/AuthCard";
import ForgotForm from "@/components/account/auth/ForgotForm";

export const metadata: Metadata = {
  title: "Reset password | Cut Labz",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard eyebrow="Account" title="Reset password">
      <ForgotForm />
    </AuthCard>
  );
}
