import type { Metadata } from "next";
import "./painel.css";

// Todo o /admin fora dos buscadores (o cabeçalho X-Robots-Tag está no
// next.config.ts). O painel NÃO usa o layout público do site.
export const metadata: Metadata = {
  title: { default: "Painel", template: "%s | Painel da ABTE" },
  robots: { index: false, follow: false, nocache: true },
};

// O marcador .painel-raiz (display: contents, sem caixa própria) liga o
// estilo dos campos do painel (painel.css), também nas janelas.
export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return <div className="painel-raiz">{children}</div>;
}
