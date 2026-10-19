import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LHS Creator Network CRM",
  description: "LHS Creator Network operations portal",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
