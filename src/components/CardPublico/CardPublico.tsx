import type { ReactNode } from "react";
import { Botao } from "@/components/Botao/Botao";
import { IconeUsuarios, IconeEstetoscopio } from "@/components/Icones/Icones";
import estilos from "./CardPublico.module.css";

type PropsCard = {
  letra: "A" | "B";
  titulo: ReactNode;
  texto: ReactNode;
  botao: { rotulo: string; href: string };
};

// Cards de público [A] e [B] (design-system.md seção 8.3). A letra escolhe a
// cor do card e o ícone do topo.
export function CardPublico({ letra, titulo, texto, botao }: PropsCard) {
  const destaque = letra === "A";
  return (
    <article className={`${estilos.card} ${destaque ? estilos.a : estilos.b}`}>
      <div className={`${estilos.topo} tipo-texto`}>
        {letra === "A" ? (
          <IconeUsuarios className={estilos.iconeDestaque} />
        ) : (
          <IconeEstetoscopio className={estilos.iconeDestaque} />
        )}
      </div>
      <div className={estilos.meio}>
        <h3 className="tipo-texto-xl">{titulo}</h3>
        <p className={`tipo-texto-lg ${estilos.texto}`}>{texto}</p>
      </div>
      <div>
        <Botao href={botao.href}>{botao.rotulo}</Botao>
      </div>
    </article>
  );
}
