import type { Metadata } from "next";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerTopicos, ordenarTopicos } from "@/lib/dados/colecoes";
import type { TipoDeTopico } from "@/lib/dados/tipos";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { GerenciadorDeTopicos } from "@/app/admin/_componentes/GerenciadorDeTopicos/GerenciadorDeTopicos";
import { topicosNaTela } from "@/app/admin/_componentes/GerenciadorDeTopicos/topicosNaTela";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Tópicos do blog" };

async function lerSeparados(tipo: TipoDeTopico) {
  return topicosNaTela(ordenarTopicos((await lerTopicos(tipo).get()).docs.map((documento) => documento.data())));
}

// Categorias e tags dos posts (25/10/2026), no mesmo padrão dos tópicos dos
// artigos: ordem, ativa, lixeira e registro das categorias em logAlteracoes.
export default async function PaginaTopicosDoBlog() {
  await exigirPapelDoPainel();
  const [categorias, tags] = await Promise.all([lerSeparados("categoriaDePost"), lerSeparados("tagDePost")]);

  return (
    <div className={estilos.pagina}>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Blog", href: "/admin/blog" }, { rotulo: "Categorias e tags" }]}
        titulo="Blog: categorias e tags"
        descricao="Categorias e tags usadas para organizar os posts do blog no site."
      />
      <GerenciadorDeTopicos
        tipo="categoriaDePost"
        comOrdem
        comAtiva
        prefixoDoEndereco="/blog?categoria="
        titulo="Categorias"
        descricao="Cada post pode ter uma categoria. As categorias ativas com post publicado aparecem como filtros em /blog, na ordem definida aqui."
        {...categorias}
      />
      <GerenciadorDeTopicos
        tipo="tagDePost"
        titulo="Tags"
        descricao="Um post pode ter várias tags. Elas aparecem como etiquetas na página do post."
        {...tags}
      />
    </div>
  );
}
