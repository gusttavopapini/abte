import Link from "next/link";
import { type ReactNode } from "react";
import { Logo } from "@/components/Logo/Logo";
import { BotaoSair } from "../BotaoSair/BotaoSair";
import estilos from "./LayoutPainel.module.css";

type PropsLayoutPainel = {
  children: ReactNode;
  usuario?: { nome?: string | null; email: string };
};

export function LayoutPainel({ children, usuario }: PropsLayoutPainel) {
  return (
    <div className={estilos.layout}>
      {/* Sidebar */}
      <aside className={estilos.sidebar}>
        <div className={estilos.cabecalhoSidebar}>
          <Logo />
        </div>
        
        <nav className={estilos.menu}>
          {/* Grupo: Blog */}
          <div className={estilos.grupoMenu}>
            <h3 className={estilos.tituloGrupo}>Blog</h3>
            <ul className={estilos.listaMenu}>
              <li>
                <Link href="/admin/blog/publicados" className={estilos.linkMenu}>
                  Posts Publicados
                </Link>
              </li>
              <li>
                <Link href="/admin/blog/rascunhos" className={estilos.linkMenu}>
                  Rascunhos
                </Link>
              </li>
              <li>
                <Link href="/admin/blog/novo" className={estilos.linkMenu}>
                  Novo Post
                </Link>
              </li>
            </ul>
          </div>

          {/* Grupo: Artigos */}
          <div className={estilos.grupoMenu}>
            <h3 className={estilos.tituloGrupo}>Artigos</h3>
            <ul className={estilos.listaMenu}>
              <li>
                <Link href="/admin/artigos/publicados" className={estilos.linkMenu}>
                  Publicados
                </Link>
              </li>
              <li>
                <Link href="/admin/artigos/rascunhos" className={estilos.linkMenu}>
                  Rascunhos
                </Link>
              </li>
              <li>
                <Link href="/admin/artigos/novo" className={estilos.linkMenu}>
                  Novo Artigo
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      {/* Conteúdo Principal */}
      <div className={estilos.conteudoPrincipal}>
        <header className={estilos.topoPainel}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-24)" }}>
            {usuario && (
              <span style={{ fontSize: "var(--font-size-small)", opacity: 0.8 }}>
                {usuario.nome || usuario.email}
              </span>
            )}
            <BotaoSair />
          </div>
        </header>

        <main className={estilos.areaPrincipal}>
          {children}
        </main>
      </div>
    </div>
  );
}
