"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { IconeMais, IconePessoa, IconeSacola } from "@/components/Icones/Icones";
import { opcoesDoMenuDaLoja } from "@/lib/loja/menu";
import estilos from "./MenuDaLoja.module.css";

export function MenuDaLoja({ logado, unidades }: { logado: boolean; unidades: number }) {
  const caminho = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const botaoRef = useRef<HTMLElement>(null);
  const opcoes = opcoesDoMenuDaLoja(caminho, { logado, unidades }).filter((opcao) => opcao.chave !== "produtos");

  useEffect(() => {
    function fecharAoClicarFora(evento: PointerEvent) {
      const menu = menuRef.current;
      if (menu?.open && evento.target instanceof Node && !menu.contains(evento.target)) menu.open = false;
    }

    function fecharComEscape(evento: KeyboardEvent) {
      const menu = menuRef.current;
      if (evento.key !== "Escape" || !menu?.open) return;
      menu.open = false;
      botaoRef.current?.focus();
    }

    document.addEventListener("pointerdown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEscape);
    return () => {
      document.removeEventListener("pointerdown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, []);

  if (caminho === "/loja/cadastro" || caminho === "/loja/entrar" || caminho.startsWith("/loja/entrar/")) return null;

  // No Safari, pressionar um link pode mover o foco para a página antes do clique.
  return (
    <details key={caminho} ref={menuRef} className={estilos.menu}>
      <summary ref={botaoRef} className={estilos.principal} aria-label="Atalhos da loja">
        <IconeMais className={estilos.iconePrincipal} />
        {unidades > 0 && <span className={estilos.quantidade} aria-hidden="true">{unidades}</span>}
      </summary>
      <nav className={estilos.atalhos} aria-label="Carrinho e conta da loja">
        <ul role="list">
          {opcoes.map((opcao) => {
            const Icone = opcao.chave === "carrinho" ? IconeSacola : IconePessoa;
            return (
              <li key={opcao.chave}>
                <Link
                  href={opcao.href}
                  className={estilos.opcao}
                  aria-current={opcao.atual ? "page" : undefined}
                  onClick={() => {
                    if (menuRef.current) menuRef.current.open = false;
                  }}
                >
                  <Icone className={estilos.iconeDaOpcao} />
                  {opcao.chave === "entrar" ? "Entrar ou criar conta" : opcao.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </details>
  );
}
