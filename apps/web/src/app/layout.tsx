import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { Nav } from "@/components/layout/Nav";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "DivorcedSathi.com — A New Beginning, Together.",
    template: "%s · DivorcedSathi.com",
  },
  description:
    "A privacy-focused matrimonial platform for genuine, marriage-oriented remarriage after divorce.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <Nav />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
