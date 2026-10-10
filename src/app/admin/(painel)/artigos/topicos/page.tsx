import type { Metadata } from "next";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerTopicosDeArtigos, ordenarTopicos } from "@/lib/dados/colecoes";
import type { TipoDeTopico, TopicoDeArtigo } from "@/lib/dados/tipos";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { GerenciadorDeTopicos, type TopicoNaTela } from "@/app/admin/_componentes/GerenciadorDeTopicos/GerenciadorDeTopicos";
import estilos from "./page.module.css";

export const metadata: Metadata = { title: "Tópicos dos artigos" };

// Só os campos que a tela usa; as datas não vão para o navegador.
function paraTela({ id, nome, slug, ordem }: TopicoDeArtigo): TopicoNaTela {
  return { id, nome, slug, ordem };
}

async function lerSeparados(tipo: TipoDeTopico) {
  const todos = ordenarTopicos((await lerTopicosDeArtigos(tipo).get()).docs.map((documento) => documento.data()));
  return {
    ativos: todos.filter((topico) => !topico.excluidoEm).map(paraTela),
    excluidos: todos.filter((topico) => topico.excluidoEm).map(paraTela),
  };
}

export default async function PaginaTopicosDeArtigos() {
  await exigirPapelDoPainel();
  const [categorias, tags] = await Promise.all([lerSeparados("categoria"), lerSeparados("tag")]);

  return (
    <div className={estilos.pagina}>
      <CabecalhoDoPainel
        titulo="Tópicos dos artigos"
        descricao="Categorias e tags usadas para organizar os artigos científicos no site."
      />
      <GerenciadorDeTopicos
        tipo="categoria"
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
