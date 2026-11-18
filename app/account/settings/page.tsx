import type { Metadata } from "next";
import { requireCustomer } from "@/lib/customer/viewer";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "@/components/account/settings/SettingsForms";

export const metadata: Metadata = {
  title: "Settings | Cut Labz",
  robots: { index: false, follow: false },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const v = await requireCustomer("/account/settings");
  const reset = sp.reset === "1";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {reset && <PasswordForm highlight />}
      <ProfileForm name={v.name} phone={v.phone} email={v.email} />
      {!reset && <PasswordForm highlight={false} />}
      <div className="pt-6">
        <DeleteAccountForm />
      </div>
    </div>
  );
}
