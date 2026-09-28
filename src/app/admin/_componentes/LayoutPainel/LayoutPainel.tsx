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
          <div className={estilos.grupoMenu}>
            <ul className={estilos.listaMenu}>
              <li>
                <Link href="/admin" className={estilos.linkMenu}>
                  Visão Geral
                </Link>
              </li>
              <li>
                <Link href="/admin/blog" className={estilos.linkMenu}>
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/admin/artigos" className={estilos.linkMenu}>
                  Artigos
                </Link>
              </li>
              <li>
                <Link href="/admin/profissionais" className={estilos.linkMenu}>
                  Profissionais
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
