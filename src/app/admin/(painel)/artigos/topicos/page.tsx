import type { Metadata } from "next";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerTopicos, ordenarTopicos } from "@/lib/dados/colecoes";
import type { TipoDeTopico } from "@/lib/dados/tipos";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { GerenciadorDeTopicos } from "@/app/admin/_componentes/GerenciadorDeTopicos/GerenciadorDeTopicos";
import { topicosNaTela } from "@/app/admin/_componentes/GerenciadorDeTopicos/topicosNaTela";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Tópicos dos artigos" };

async function lerSeparados(tipo: TipoDeTopico) {
  return topicosNaTela(ordenarTopicos((await lerTopicos(tipo).get()).docs.map((documento) => documento.data())));
}

export default async function PaginaTopicosDeArtigos() {
  await exigirPapelDoPainel();
  const [categorias, tags] = await Promise.all([lerSeparados("categoria"), lerSeparados("tag")]);

  return (
    <div className={estilos.pagina}>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Artigos", href: "/admin/artigos" }, { rotulo: "Categorias e tags" }]}
        titulo="Artigos: categorias e tags"
        descricao="Categorias e tags usadas para organizar os artigos científicos no site."
      />
      <GerenciadorDeTopicos
        tipo="categoria"
        comOrdem
        comImagem
        comAtiva
        ondeAparece="no card da categoria em /artigos"
        prefixoDoEndereco="/artigos/categoria/"
        titulo="Categorias"
        descricao="Cada artigo tem uma categoria. As categorias aparecem em /artigos, na seção de tópicos, na ordem definida aqui."
        {...categorias}
      />
      <GerenciadorDeTopicos
        tipo="tag"
        titulo="Tags"
        descricao="Um artigo pode ter várias tags. Elas aparecem como etiquetas na página do artigo."
        {...tags}
      />
    </div>
  );
}
