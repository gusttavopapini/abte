import type { ReactNode } from "react";
import estilos from "./BarraDeSalvar.module.css";

// Barra com os botões de salvar (29/10/2026): fica presa ao pé da tela nos
// formulários longos, para salvar sem rolar até o fim.
export function BarraDeSalvar({ children, aviso }: { children: ReactNode; aviso?: ReactNode }) {
  return (
    <div className={estilos.barra}>
      {aviso && <p className={estilos.aviso}>{aviso}</p>}
      <div className={estilos.botoes}>{children}</div>
    </div>
  );
}
