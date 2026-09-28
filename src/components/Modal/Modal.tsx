import { type ReactNode, useEffect } from "react";
import estilos from "./Modal.module.css";

type PropsModal = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
};

export function Modal({ aberto, aoFechar, titulo, children }: PropsModal) {
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className={estilos.overlay} onClick={aoFechar}>
      <div className={estilos.modal} onClick={(e) => e.stopPropagation()}>
        <header className={estilos.cabecalho}>
          <h2 className={estilos.titulo}>{titulo}</h2>
          <button className={estilos.botaoFechar} onClick={aoFechar} aria-label="Fechar">
            &times;
          </button>
        </header>
        <div className={estilos.conteudo}>
          {children}
        </div>
      </div>
    </div>
  );
}
