"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import estilos from "./SubcabecalhoLoja.module.css";

// ativoEm: caminhos (além do próprio href) em que o link fica marcado como atual.
export type LinkDaLoja = { rotulo: string; href: string; ativoEm?: string[] };

// Subcabeçalho próprio da loja: aparece só em /loja e nas rotas filhas.
// O cabeçalho do site não tem login nem carrinho (decisão D1).
export function SubcabecalhoLoja({ links }: { links: LinkDaLoja[] }) {
  const pathname = usePathname();
  const ativo = (link: LinkDaLoja) =>
    pathname === link.href || (link.ativoEm ?? []).some((caminho) => pathname === caminho || pathname.startsWith(`${caminho}/`));

  return (
    <nav aria-label="Loja" className={estilos.barra}>
      <ul role="list" className={`container ${estilos.lista}`}>
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className={estilos.link} aria-current={ativo(link) ? "page" : undefined}>
              {link.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
