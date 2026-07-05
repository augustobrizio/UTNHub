import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

/**
 * Manrope (titulares — geometrico, "high-tech identity") e
 * Inter (UI/data — funcional). Cargados via next/font con CSS variables
 * para enchufarlos en `tailwind.config.ts`.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "600", "700", "800"],
  display: "swap", 
});

export const metadata: Metadata = {
  title: "UTNHub — Student Dashboard",
  description:
    "Asistente integral para estudiantes de UTN FRRO: chatbot, grafo de correlativas, calendario y mas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Material Symbols Outlined — los iconos del Stitch. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="bg-surface text-on-surface font-body selection:bg-primary/30 antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
