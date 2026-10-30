import type { ReactNode } from "react";
import estilos from "./CaixaDoPainel.module.css";

export type TipoDeCaixa = "informacao" | "atencao" | "erro" | "sucesso";

// Palavra que abre a caixa: o tipo não depende só da cor.
const PALAVRAS: Record<TipoDeCaixa, string> = { informacao: "Informação", atencao: "Atenção", erro: "Erro", sucesso: "Pronto" };

type Props = {
  tipo?: TipoDeCaixa;
  titulo?: string;
  children: ReactNode;
  className?: string;
  // Mensagens que aparecem depois de uma ação: anunciadas aos leitores de tela.
  anunciar?: boolean;
};

// Caixa de texto do painel (29/10/2026): orientação, descrição ou aviso que
// antes ficava solto na página. Painel branco com raio, --panel-padding,
// título curto e texto, com a palavra do tipo (Informação, Atenção, Erro).
export function CaixaDoPainel({ tipo = "informacao", titulo, children, className, anunciar }: Props) {
  const papel = anunciar ? (tipo === "erro" ? "alert" : "status") : undefined;
  return (
    <div className={`${estilos.caixa} ${estilos[tipo]} ${className ?? ""}`} role={papel}>
      <p className={estilos.titulo}>
        <span className={estilos.tipo}>{PALAVRAS[tipo]}</span>
        {titulo && <span>{titulo}</span>}
      </p>
      <div className={estilos.texto}>{children}</div>
    </div>
  );
}
