import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audiotations",
  description: "Record audio notes for the books you read",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased min-h-screen"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
      >
        {children}
      </body>
    </html>
  );
}
