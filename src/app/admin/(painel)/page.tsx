import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Visão Geral" };

// Atalhos para as áreas do painel, na ordem do menu.
const AREAS = [
  { href: "/admin/home", titulo: "Home", texto: "Banners do carrossel e imagens das seções da página inicial." },
  { href: "/admin/blog", titulo: "Blog", texto: "Posts publicados e rascunhos, com capa e imagens no texto." },
  { href: "/admin/artigos", titulo: "Artigos", texto: "Artigos científicos, autores, link e imagem." },
  { href: "/admin/profissionais", titulo: "Profissionais", texto: "Diretório de profissionais, com foto e contatos." },
  { href: "/admin/loja", titulo: "Loja", texto: "Produtos, preços, galeria de imagens e categorias." },
  { href: "/admin/midia", titulo: "Mídia", texto: "Todas as imagens do site, onde cada uma é usada e a lixeira." },
];

export default function PaginaPainel() {
  return (
    <div>
      <CabecalhoDoPainel
        titulo="Painel da ABTE"
        descricao="Escolha uma área para editar. Tudo o que é salvo aqui aparece no site; rascunhos e itens ocultos ficam só no painel."
      />
      <ul role="list" className={estilos.areas}>
        {AREAS.map((area) => (
          <li key={area.href}>
            <Link href={area.href} className={estilos.area}>
              <span className={estilos.tituloDaArea}>
                {area.titulo}
                <span className="seta-para-frente" aria-hidden="true">&nbsp;&rarr;</span>
              </span>
              <span className={estilos.textoDaArea}>{area.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
