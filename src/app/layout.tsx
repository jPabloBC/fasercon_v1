import type { Metadata } from "next";
import { Sintony } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const sintony = Sintony({
  weight: ['400', '700'],
  variable: "--font-sintony",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fasercom - Especialistas en Cubiertas y Techos Metálicos",
  description: "Empresa especializada en cubiertas, techos y revestimientos metálicos de alta calidad. Más de 10 años de experiencia en proyectos industriales y residenciales.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${sintony.variable} antialiased font-sintony`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
