"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useContext } from "react";
import { opcoesDoMenuDaLoja } from "@/lib/loja/menu";
import estilos from "./LinksDaLoja.module.css";

// Sessão do cliente e quantidade do carrinho, lidas uma vez no layout da loja.
type DadosDaLoja = { logado: boolean; unidades: number };
const ContextoDaLoja = createContext<DadosDaLoja>({ logado: false, unidades: 0 });

export function ProvedorDaLoja({ logado, unidades, children }: DadosDaLoja & { children: ReactNode }) {
  return <ContextoDaLoja.Provider value={{ logado, unidades }}>{children}</ContextoDaLoja.Provider>;
}

// Links discretos da loja (08/11/2026), no lugar do menu flutuante "⋮", que
// cobria os cards: Produtos, Carrinho (com a quantidade) e Entrar ou Minha
// conta, as mesmas opções de antes (opcoesDoMenuDaLoja). Na lista e na página
// do produto, "Produtos" sai: a própria página já é a lista ou tem "Voltar
// para a loja". A página atual fica marcada (aria-current).
export function LinksDaLoja({ className = "" }: { className?: string }) {
  const caminho = usePathname();
  const dados = useContext(ContextoDaLoja);
  const naVitrine = caminho === "/loja" || caminho.startsWith("/loja/produto/");
  const opcoes = opcoesDoMenuDaLoja(caminho, dados).filter((opcao) => !(naVitrine && opcao.chave === "produtos"));
  return (
    <nav aria-label="Loja: carrinho e conta" className={`${estilos.links} ${className}`}>
      <ul role="list" className={estilos.lista}>
        {opcoes.map((opcao) => (
          <li key={opcao.chave}>
            <Link href={opcao.href} aria-current={opcao.atual ? "page" : undefined} className={`realce ${estilos.link}`}>
              {opcao.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
