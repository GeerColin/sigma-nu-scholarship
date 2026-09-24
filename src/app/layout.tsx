import type { Metadata } from "next";
import "./globals.css";
import { PresentationPrivacyProvider } from "@/components/presentation-privacy";
import { getPresentationPrivacyCookie } from "@/lib/presentation-privacy";

export const metadata: Metadata = {
  title: "Sigma Nu Scholarship",
  description:
    "Academic check-ins and scholarship operations for Sigma Nu Eta Chapter.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const initialPrivacy = await getPresentationPrivacyCookie();
  return (
    <html lang="en">
      <body>
        <PresentationPrivacyProvider initialEnabled={initialPrivacy}>
          {children}
        </PresentationPrivacyProvider>
      </body>
    </html>
  );
}
