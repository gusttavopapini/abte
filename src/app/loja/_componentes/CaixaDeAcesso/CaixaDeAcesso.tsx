import type { ReactNode } from "react";
import { Botao } from "@/components/Botao/Botao";
import estilos from "./CaixaDeAcesso.module.css";

type Props = {
  titulo: string;
  descricao?: string;
  children: ReactNode;
};

export function CaixaDeAcesso({ titulo, descricao, children }: Props) {
  return (
    <div className={`container ${estilos.secao}`}>
      <Botao href="/loja" variante="link" className={estilos.voltar}>
        <span className="seta-para-tras" aria-hidden="true">&larr;</span>
        Voltar para a loja
      </Botao>
      <section aria-labelledby="titulo-acesso-loja" className={estilos.caixa}>
        <header className={estilos.cabecalho}>
          <h1 id="titulo-acesso-loja" className="tipo-h2">{titulo}</h1>
          {descricao && <p>{descricao}</p>}
        </header>
        <div className={estilos.conteudo}>{children}</div>
      </section>
    </div>
  );
}
