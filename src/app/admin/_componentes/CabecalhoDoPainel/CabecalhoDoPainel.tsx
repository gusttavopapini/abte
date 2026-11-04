import Link from "next/link";
import type { ReactNode } from "react";
import estilos from "./CabecalhoDoPainel.module.css";

export type PassoDaTrilha = { rotulo: string; href?: string };

type PropsCabecalhoDoPainel = {
  titulo: string;
  descricao: ReactNode;
  // Trilha de navegação, sempre a partir da Visão geral (ex.: Visão geral /
  // Blog / Editar post); o último passo é a página atual.
  trilha?: PassoDaTrilha[];
  // Ação principal da tela (um botão primário), à direita.
  acao?: ReactNode;
};

// Cabeçalho das telas do painel (29/10/2026; etapa 3, 04/11/2026): o botão
// "Voltar" (sempre para o passo anterior da trilha, o mesmo em todas as
// telas), a trilha de navegação, o H1, a descrição numa caixa branca e a
// ação principal alinhada à direita (embaixo, no celular).
export function CabecalhoDoPainel({ titulo, descricao, trilha, acao }: PropsCabecalhoDoPainel) {
  const anterior = trilha ? [...trilha].reverse().find((passo) => passo.href) : undefined;
  return (
    <header className={estilos.cabecalho}>
      {trilha && trilha.length > 0 && (
        <div className={estilos.topo}>
          {anterior?.href && (
            <Link href={anterior.href} className={`realce ${estilos.voltar}`}>
              <span className="seta-para-tras" aria-hidden="true">&larr;</span>
              Voltar para {anterior.rotulo}
            </Link>
          )}
          <nav aria-label="Trilha de navegação">
            <ol className={estilos.trilha}>
              {trilha.map((passo, indice) => (
                <li key={`${passo.rotulo}-${indice}`}>
                  {passo.href ? (
                    <Link href={passo.href} className="realce">
                      {passo.rotulo}
                    </Link>
                  ) : (
                    <span aria-current="page">{passo.rotulo}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      )}
      <div className={estilos.linha}>
        <h1 className={`tipo-h3 ${estilos.titulo}`}>{titulo}</h1>
        {acao && <div className={estilos.acao}>{acao}</div>}
      </div>
      <div className={estilos.descricao}>{typeof descricao === "string" ? <p>{descricao}</p> : descricao}</div>
    </header>
  );
}
