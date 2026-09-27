import type { ReactNode } from "react";
import { Botao } from "@/components/Botao/Botao";
import { Rotulo } from "@/components/Rotulo/Rotulo";
import estilos from "./CardPublico.module.css";

type PropsCard = {
  letra: "A" | "B";
  frase: ReactNode;
  titulo: ReactNode;
  texto: ReactNode;
  botao: { rotulo: string; href: string };
};

// Cards de público [A] e [B] (design-system.md seção 8.3).
// [A] fica sobre #76ACF5: rótulo e frase com 24px fixos (regra do #76ACF5).
export function CardPublico({ letra, frase, titulo, texto, botao }: PropsCard) {
  const destaque = letra === "A";
  const classeTopo = "tipo-texto";
  return (
    <article className={`${estilos.card} ${destaque ? estilos.a : estilos.b}`}>
      <div className={`${estilos.topo} ${classeTopo}`}>
        <Rotulo texto={letra} />
        <p className={estilos.frase}>{frase}</p>
      </div>
      <div className={estilos.meio}>
        <h3 className="tipo-texto-xl">{titulo}</h3>
        <p className="tipo-texto-lg" style={{ fontWeight: 300 }}>{texto}</p>
      </div>
      <div>
        <Botao href={botao.href}>{botao.rotulo}</Botao>
      </div>
    </article>
  );
}
