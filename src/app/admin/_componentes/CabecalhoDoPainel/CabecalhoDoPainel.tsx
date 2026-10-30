import Link from "next/link";
import type { ReactNode } from "react";
import estilos from "./CabecalhoDoPainel.module.css";

export type PassoDaTrilha = { rotulo: string; href?: string };

type PropsCabecalhoDoPainel = {
  titulo: string;
  descricao: ReactNode;
  // Trilha de navegação (ex.: Blog / Editar post); o último passo é a página.
  trilha?: PassoDaTrilha[];
  // Ação principal da tela (um botão primário), à direita.
  acao?: ReactNode;
};

// Cabeçalho das telas do painel (29/10/2026): trilha com o "Voltar" implícito
// (o passo anterior é link), H1, descrição numa caixa branca e a ação
// principal alinhada à direita (embaixo, no celular).
export function CabecalhoDoPainel({ titulo, descricao, trilha, acao }: PropsCabecalhoDoPainel) {
  return (
    <header className={estilos.cabecalho}>
      {trilha && trilha.length > 0 && (
        <nav aria-label="Trilha de navegação">
          <ol className={estilos.trilha}>
            {trilha.map((passo, indice) => (
              <li key={`${passo.rotulo}-${indice}`}>
                {passo.href ? (
                  <Link href={passo.href} className="realce">
                    {indice === 0 && <span className="seta-para-tras" aria-hidden="true">&larr;&nbsp;</span>}
                    {passo.rotulo}
                  </Link>
                ) : (
                  <span aria-current="page">{passo.rotulo}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className={estilos.linha}>
        <h1 className={`tipo-h3 ${estilos.titulo}`}>{titulo}</h1>
        {acao && <div className={estilos.acao}>{acao}</div>}
      </div>
      <div className={estilos.descricao}>{typeof descricao === "string" ? <p>{descricao}</p> : descricao}</div>
    </header>
  );
}
