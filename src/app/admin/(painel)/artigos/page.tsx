import type { Metadata } from "next";
import { AcoesDoItem } from "@/app/admin/_componentes/AcoesDoItem/AcoesDoItem";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { ListaDoPainel, type ItemDaLista, type OrdenacaoDaLista } from "@/app/admin/_componentes/ListaDoPainel/ListaDoPainel";
import { MensagensDoPainel } from "@/app/admin/_componentes/MensagensDoPainel/MensagensDoPainel";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { Botao } from "@/components/Botao/Botao";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerArtigos, lerTopicos } from "@/lib/dados/colecoes";
import { lerConfiguracaoDoSiteEmCache } from "@/lib/dados/site";
import { situacaoDoItem } from "@/lib/lixeira";

export const metadata: Metadata = { title: "Artigos" };

// O que se perde ao excluir um artigo de vez (texto da confirmação reforçada).
const PERDAS = [
  "O título, os autores, o resumo, o link, a categoria e as tags deste artigo.",
  "O endereço do artigo no site deixa de existir.",
  "A imagem não é apagada: continua na biblioteca de mídia.",
];

const ORDENACOES: OrdenacaoDaLista[] = [
  { valor: "recentes", rotulo: "Mais recentes primeiro", chave: "criadoEm", direcao: "desc" },
  { valor: "antigos", rotulo: "Mais antigos primeiro", chave: "criadoEm", direcao: "asc" },
  { valor: "titulo", rotulo: "Título, de A a Z", chave: "titulo", direcao: "asc" },
  { valor: "categoria", rotulo: "Categoria, de A a Z", chave: "categoria", direcao: "asc" },
];

export default async function PaginaAdminArtigos() {
  const usuario = await exigirPapelDoPainel();
  const podeExcluirDeVez = papelPodeExecutar(usuario.papel, "conteudo.excluirDeVez");
  const artigos = (await lerArtigos().get()).docs.map((documento) => documento.data());
  // Nome de cada categoria pelo id (inclusive as que estão na lixeira).
  const categorias = new Map((await lerTopicos("categoria").get()).docs.map((documento) => [documento.id, documento.data().nome]));
  // Com os artigos desligados nas configurações, as páginas públicas dão 404.
  const artigosNoSite = (await lerConfiguracaoDoSiteEmCache()).artigosAtivo;

  const itens: ItemDaLista[] = artigos.map((artigo) => {
    const situacao = situacaoDoItem("artigos", { status: artigo.status, excluidoEm: artigo.excluidoEm });
    const categoria = categorias.get(artigo.categoria) ?? "Sem categoria";
    return {
      id: artigo.id,
      nome: artigo.titulo,
      busca: categoria,
      situacao,
      chaves: { criadoEm: artigo.criadoEm?.getTime() ?? 0, titulo: artigo.titulo, categoria },
      celulas: [artigo.titulo, categoria, <SeloStatus key="situacao" status={situacao} />],
      acoes: (
        <AcoesDoItem
          colecao="artigos"
          id={artigo.id}
          nome={artigo.titulo}
          situacao={situacao}
          hrefEditar={`/admin/artigos/editar/${artigo.id}`}
          hrefNoSite={artigosNoSite ? `/artigos/${artigo.id}` : null}
          podeExcluirDeVez={podeExcluirDeVez}
          podeDuplicar
          prefixoDaCopia="/admin/artigos/editar/"
          perdas={PERDAS}
        />
      ),
    };
  });

  return (
    <div>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Artigos" }]}
        titulo="Artigos científicos"
        descricao={`Artigos científicos. Só os publicados aparecem em /artigos; os da lixeira voltam como rascunho se forem restaurados.${podeExcluirDeVez ? "" : " Só o administrador exclui de vez."} Categorias e tags ficam em Artigos: categorias e tags.`}
        acao={<Botao href="/admin/artigos/novo">Adicionar artigo</Botao>}
      />
      <MensagensDoPainel>
        <ListaDoPainel
          colecao="artigos"
          itens={itens}
          colunas={["Título", "Categoria", "Situação"]}
          ordenacoes={ORDENACOES}
          rotulos={{ singular: "artigo", plural: "artigos", publicados: "Publicados", rascunhos: "Rascunhos" }}
          rotuloDaBusca="Buscar pelo título ou categoria"
          comSituacao
          estadoVazio={
            <>
              <p className="tipo-texto">Nenhum artigo ainda. Cada artigo precisa de uma categoria: cadastre antes em Artigos: categorias e tags.</p>
              <Botao href="/admin/artigos/novo" variante="secundario">Adicionar o primeiro artigo</Botao>
            </>
          }
        />
      </MensagensDoPainel>
    </div>
  );
}
