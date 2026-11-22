import type { ReactNode } from "react";
import { LinksDaLoja } from "../LinksDaLoja/LinksDaLoja";
import estilos from "./PaginaDaLoja.module.css";

// Estrutura comum das páginas internas da loja (21/11/2026), no visual da
// "Minha conta": links da loja (Produtos, Carrinho, Entrar ou Minha conta), título com descrição e
// uma ação opcional à direita; o conteúdo vem em cartões (CartaoDaLoja).
export function PaginaDaLoja({ titulo, descricao, acao, children }: { titulo: ReactNode; descricao?: ReactNode; acao?: ReactNode; children: ReactNode }) {
  return (
    <div className={`container ${estilos.secao}`}>
      <header className={estilos.cabecalho}>
        <LinksDaLoja />
        <div className={estilos.abertura}>
          <div className={estilos.introducao}>
            <h1 className="tipo-h2">{titulo}</h1>
            {descricao && <div className={estilos.descricao}>{descricao}</div>}
          </div>
          {acao}
        </div>
      </header>
      {children}
    </div>
  );
}

// Cartão branco com ícone e título (h2).
export function CartaoDaLoja({ id, titulo, icone, children, className = "" }: { id: string; titulo: ReactNode; icone?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={`${estilos.cartao} ${className}`}>
      <header className={estilos.cabecalhoDoCartao}>
        {icone && <span className={estilos.icone}>{icone}</span>}
        <h2 id={id} className={estilos.tituloDoCartao}>{titulo}</h2>
      </header>
      {children}
    </section>
  );
}
