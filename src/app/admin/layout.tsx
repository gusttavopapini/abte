import type { Metadata } from "next";

// Todo o /admin fora dos buscadores (o cabeçalho X-Robots-Tag está no
// next.config.ts). O painel NÃO usa o layout público do site.
export const metadata: Metadata = {
  title: { default: "Painel", template: "%s | Painel da ABTE" },
  robots: { index: false, follow: false, nocache: true },
};

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return children;
}
