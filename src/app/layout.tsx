import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RogueWeb: Echoes of the Grid",
  description: "Un roguelike de exploración y combate por turnos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
