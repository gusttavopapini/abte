"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { IconeFechar, IconeMenu } from "@/components/Icones/Icones";
import { Logo } from "@/components/Logo/Logo";
import estilos from "./LayoutPainel.module.css";

type PropsLayoutPainel = {
  children: ReactNode;
  usuario?: { nome?: string | null; email: string; papel?: string };
  // Botão "Sair" (formulário com ação de servidor), montado no servidor.
  sair: ReactNode;
};

// Itens do menu, na ordem do trabalho (29/10/2026).
type ItemDoPainel = { href: string; rotulo: string; exato?: boolean; fora?: string[]; soAdministrador?: boolean };

const ITENS: ItemDoPainel[] = [
  { href: "/admin", rotulo: "Visão geral", exato: true },
  { href: "/admin/home", rotulo: "Home" },
  { href: "/admin/blog", rotulo: "Blog", fora: ["/admin/blog/topicos"] },
  { href: "/admin/blog/topicos", rotulo: "Blog: categorias e tags" },
  { href: "/admin/artigos", rotulo: "Artigos", fora: ["/admin/artigos/topicos"] },
  { href: "/admin/artigos/topicos", rotulo: "Artigos: categorias e tags" },
  { href: "/admin/profissionais", rotulo: "Profissionais" },
  { href: "/admin/loja", rotulo: "Loja", fora: ["/admin/loja/categorias"] },
  { href: "/admin/loja/categorias", rotulo: "Loja: categorias" },
  { href: "/admin/midia", rotulo: "Mídia" },
  // Só administrador (30/10/2026); para o editor, o item não aparece.
  { href: "/admin/configuracoes", rotulo: "Configurações", soAdministrador: true },
];

function itemAtual(caminho: string, item: ItemDoPainel): boolean {
  if (item.exato) return caminho === item.href;
  if (item.fora?.some((outro) => caminho.startsWith(outro))) return false;
  return caminho === item.href || caminho.startsWith(`${item.href}/`);
}

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Estrutura do painel (29/10/2026). A partir de 1024px, barra lateral fixa
// com o menu. Até 1023px, um cabeçalho com o botão "Menu" que abre o menu
// numa gaveta (foco preso, Esc fecha e devolve o foco ao botão, página sem
// rolar, animação curta; com movimento reduzido, sem animação).
export function LayoutPainel({ children, usuario, sair }: PropsLayoutPainel) {
  const caminho = usePathname();
  const idGaveta = useId();
  const [aberta, setAberta] = useState(false);
  const gavetaRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);

  // Trocar de página fecha a gaveta.
  const [caminhoVisto, setCaminhoVisto] = useState(caminho);
  if (caminhoVisto !== caminho) {
    setCaminhoVisto(caminho);
    setAberta(false);
  }

  useEffect(() => {
    if (!aberta) return;
    const corpo = document.body;
    corpo.style.overflow = "hidden";
    const botao = botaoRef.current;
    gavetaRef.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus();
    return () => {
      corpo.style.overflow = "";
      botao?.focus();
    };
  }, [aberta]);

  function aoTeclarNaGaveta(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      setAberta(false);
      return;
    }
    if (evento.key !== "Tab" || !gavetaRef.current) return;
    const focaveis = [...gavetaRef.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo?.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro?.focus();
    }
  }

  const nomeDoUsuario = usuario ? usuario.nome || usuario.email : null;
  const menu = (
    <nav aria-label="Menu do painel" className={estilos.menu}>
      <ul role="list" className={estilos.listaMenu}>
        {ITENS.filter((item) => !item.soAdministrador || usuario?.papel === "administrador").map((item) => {
          const atual = itemAtual(caminho, item);
          return (
            <li key={item.href}>
              <Link href={item.href} className={`${estilos.linkMenu} ${atual ? estilos.atual : ""}`} aria-current={atual ? "page" : undefined}>
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
  const rodapeDoMenu = (
    <div className={estilos.usuario}>
      {nomeDoUsuario && <p className={estilos.nomeDoUsuario}>{nomeDoUsuario}</p>}
      {sair}
    </div>
  );

  return (
    <div className={estilos.layout}>
      {/* A partir de 1024px */}
      <aside className={estilos.lateral} aria-label="Painel da ABTE">
        <div className={estilos.marca}>
          <Logo />
          <p className={estilos.nomeDoPainel}>Painel</p>
        </div>
        {menu}
        {rodapeDoMenu}
      </aside>

      {/* Até 1023px */}
      <header className={estilos.topo}>
        <div className={estilos.marca}>
          <Logo />
          <p className={estilos.nomeDoPainel}>Painel</p>
        </div>
        <button ref={botaoRef} type="button" className={estilos.botaoMenu} aria-expanded={aberta} aria-controls={idGaveta} onClick={() => setAberta(true)}>
          <IconeMenu className={estilos.icone} />
          Menu
        </button>
      </header>
      <div className={`${estilos.fundo} ${aberta ? estilos.fundoVisivel : ""}`} onClick={() => setAberta(false)} aria-hidden="true" />
      <div
        ref={gavetaRef}
        id={idGaveta}
        role="dialog"
        aria-modal="true"
        aria-label="Menu do painel"
        className={`${estilos.gaveta} ${aberta ? estilos.gavetaAberta : ""}`}
        inert={!aberta}
        onKeyDown={aoTeclarNaGaveta}
      >
        <div className={estilos.cabecalhoDaGaveta}>
          <p className={estilos.nomeDoPainel}>Menu do painel</p>
          <button type="button" className={estilos.botaoFechar} onClick={() => setAberta(false)} aria-label="Fechar o menu">
            <IconeFechar className={estilos.icone} />
          </button>
        </div>
        {menu}
        {rodapeDoMenu}
      </div>

      <main id="conteudo-do-painel" className={estilos.principal}>
        {children}
      </main>
    </div>
  );
}
