"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { IconeFechar, IconeMenu } from "@/components/Icones/Icones";
import { Logo } from "@/components/Logo/Logo";
import { BotaoDasConfiguracoes, type ConfiguracoesDoSiteNaTela } from "../ConfiguracoesDoSite/ConfiguracoesDoSite";
import { IconeAjustes, IconeCaixa, IconeCasa, IconeImagem, IconeLivro, IconePaginas, IconePessoas, IconeTexto, IconeVisaoGeral } from "./IconesDoPainel";
import { IconeEnvelope } from "./IconesDoPainel";
import estilos from "./LayoutPainel.module.css";

type PropsLayoutPainel = {
  children: ReactNode;
  usuario?: { nome?: string | null; email: string; papel?: string };
  // Botão "Sair" (formulário com ação de servidor), montado no servidor.
  sair: ReactNode;
  // Configurações do site (só para o administrador; null esconde o botão).
  configuracoes?: ConfiguracoesDoSiteNaTela | null;
};

// Menu agrupado (etapa 3, 04/11/2026): Visão geral; Conteúdo; Pessoas;
// Loja; Mídia; Configurações. Os subitens (categorias e tags) ficam recuados
// abaixo do item a que pertencem, sem ícone.
type ItemDoPainel = {
  href: string;
  rotulo: string;
  icone?: (props: { className?: string }) => ReactNode;
  sub?: boolean;
  exato?: boolean;
  fora?: string[];
  soAdministrador?: boolean;
};
type GrupoDoPainel = { titulo: string | null; itens: ItemDoPainel[] };

const GRUPOS: GrupoDoPainel[] = [
  { titulo: null, itens: [{ href: "/admin", rotulo: "Visão geral", icone: IconeVisaoGeral, exato: true }] },
  {
    titulo: "Conteúdo",
    itens: [
      { href: "/admin/home", rotulo: "Home", icone: IconeCasa },
      { href: "/admin/blog", rotulo: "Blog", icone: IconeTexto, fora: ["/admin/blog/topicos"] },
      { href: "/admin/blog/topicos", rotulo: "Categorias e tags do blog", sub: true },
      { href: "/admin/artigos", rotulo: "Artigos", icone: IconeLivro, fora: ["/admin/artigos/topicos"] },
      { href: "/admin/artigos/topicos", rotulo: "Categorias e tags dos artigos", sub: true },
      // Só administrador (30/10/2026); para o editor, o item não aparece.
      { href: "/admin/paginas", rotulo: "Páginas", icone: IconePaginas, soAdministrador: true },
    ],
  },
  { titulo: "Pessoas", itens: [{ href: "/admin/profissionais", rotulo: "Profissionais", icone: IconePessoas }] },
  {
    titulo: "Loja",
    itens: [
      { href: "/admin/loja", rotulo: "Produtos", icone: IconeCaixa, fora: ["/admin/loja/categorias"] },
      { href: "/admin/loja/categorias", rotulo: "Categorias da loja", sub: true },
    ],
  },
  { titulo: null, itens: [{ href: "/admin/midia", rotulo: "Mídia", icone: IconeImagem }] },
  // Mensagens do formulário de contato (08/11/2026): só administrador.
  { titulo: null, itens: [{ href: "/admin/mensagens", rotulo: "Mensagens", icone: IconeEnvelope, soAdministrador: true }] },
  { titulo: null, itens: [{ href: "/admin/configuracoes", rotulo: "Configurações", icone: IconeAjustes, soAdministrador: true }] },
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
export function LayoutPainel({ children, usuario, sair, configuracoes }: PropsLayoutPainel) {
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
  // O menu aparece duas vezes (barra lateral e gaveta): os ids dos títulos
  // dos grupos levam o lugar, para não se repetirem na página.
  const ehAdministrador = usuario?.papel === "administrador";
  const menu = (lugar: "lateral" | "gaveta") => (
    <nav aria-label="Menu do painel" className={estilos.menu}>
      {GRUPOS.map((grupo, indiceDoGrupo) => {
        const itens = grupo.itens.filter((item) => !item.soAdministrador || ehAdministrador);
        if (itens.length === 0) return null;
        const idDoTitulo = `${idGaveta}-${lugar}-grupo-${indiceDoGrupo}`;
        return (
          <div key={indiceDoGrupo} className={estilos.grupo}>
            {grupo.titulo && (
              <p id={idDoTitulo} className={estilos.tituloDoGrupo}>
                {grupo.titulo}
              </p>
            )}
            <ul role="list" className={estilos.listaMenu} aria-labelledby={grupo.titulo ? idDoTitulo : undefined}>
              {itens.map((item) => {
                const atual = itemAtual(caminho, item);
                const Icone = item.icone;
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={`${estilos.linkMenu} ${item.sub ? estilos.subitem : ""} ${atual ? estilos.atual : ""}`} aria-current={atual ? "page" : undefined}>
                      {Icone && <Icone className={estilos.iconeDoMenu} />}
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
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

        {menu("lateral")}
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
        // Só é janela enquanto está aberta (04/11/2026): fechada, fica inerte
        // e sem papel de diálogo (antes, role="dialog" e aria-modal ficavam
        // na página o tempo todo).
        role={aberta ? "dialog" : undefined}
        aria-modal={aberta ? true : undefined}
        aria-label={aberta ? "Menu do painel" : undefined}
        className={`${estilos.gaveta} ${aberta ? estilos.gavetaAberta : ""}`}
        inert={!aberta}
        onKeyDown={aoTeclarNaGaveta}
      >
        <div className={estilos.cabecalhoDaGaveta}>
          <p className={estilos.nomeDoPainel}>Menu do painel</p>
          {configuracoes && <BotaoDasConfiguracoes configuracoes={configuracoes} />}
          <button type="button" className={estilos.botaoFechar} onClick={() => setAberta(false)} aria-label="Fechar o menu">
            <IconeFechar className={estilos.icone} />
          </button>
        </div>
        {menu("gaveta")}
        {rodapeDoMenu}
      </div>

      <main id="conteudo-do-painel" className={estilos.principal}>
        {configuracoes && <div className={estilos.barraSuperior}><BotaoDasConfiguracoes configuracoes={configuracoes} /></div>}
        {children}
      </main>
    </div>
  );
}
