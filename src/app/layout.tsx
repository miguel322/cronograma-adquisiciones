import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crono - Automatic Schedule Generator",
  description: "Highly optimized automatic schedule generator for professional project management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#050505] text-[#ededed] antialiased">
        {children}
      </body>
    </html>
  );
}
