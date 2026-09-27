import type { ReactNode } from "react";
import { Logo } from "@/components/Logo/Logo";
import estilos from "./EstruturaPainel.module.css";

// Moldura simples das telas do painel: logo, título e um painel branco.
// Usa os mesmos tokens e componentes do site, sem header, menu nem rodapé.
export function EstruturaPainel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className={`container ${estilos.pagina}`}>
      <div className={estilos.coluna}>
        <Logo />
        <h1 className="tipo-h2">{titulo}</h1>
        <div className={estilos.painel}>{children}</div>
      </div>
    </main>
  );
}
