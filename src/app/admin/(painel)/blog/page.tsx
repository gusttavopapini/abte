import type { Metadata } from "next";
import { AcoesDoItem } from "@/app/admin/_componentes/AcoesDoItem/AcoesDoItem";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { ListaDoPainel, type ItemDaLista, type OrdenacaoDaLista } from "@/app/admin/_componentes/ListaDoPainel/ListaDoPainel";
import { MensagensDoPainel } from "@/app/admin/_componentes/MensagensDoPainel/MensagensDoPainel";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { Botao } from "@/components/Botao/Botao";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerPosts } from "@/lib/dados/colecoes";
import { situacaoDoItem } from "@/lib/lixeira";

export const metadata: Metadata = { title: "Blog" };

// O que se perde ao excluir um post de vez (texto da confirmação reforçada).
const PERDAS = [
  "O título, o texto, a categoria e as tags deste post.",
  "O endereço do post no blog deixa de existir.",
  "As imagens não são apagadas: continuam na biblioteca de mídia.",
];

const ORDENACOES: OrdenacaoDaLista[] = [
  { valor: "recentes", rotulo: "Mais recentes primeiro", chave: "criadoEm", direcao: "desc" },
  { valor: "antigos", rotulo: "Mais antigos primeiro", chave: "criadoEm", direcao: "asc" },
  { valor: "titulo", rotulo: "Título, de A a Z", chave: "titulo", direcao: "asc" },
  { valor: "titulo-inverso", rotulo: "Título, de Z a A", chave: "titulo", direcao: "desc" },
];

export default async function PaginaAdminBlog() {
  const usuario = await exigirPapelDoPainel();
  const podeExcluirDeVez = papelPodeExecutar(usuario.papel, "conteudo.excluirDeVez");
  const posts = (await lerPosts().get()).docs.map((documento) => documento.data());

  const itens: ItemDaLista[] = posts.map((post) => {
    const situacao = situacaoDoItem("posts", { status: post.status, excluidoEm: post.excluidoEm });
    return {
      id: post.id,
      nome: post.titulo,
      situacao,
      chaves: { criadoEm: post.criadoEm?.getTime() ?? 0, titulo: post.titulo },
      celulas: [post.titulo, <SeloStatus key="situacao" status={situacao} />, post.criadoEm ? post.criadoEm.toLocaleDateString("pt-BR") : "Sem data"],
      acoes: (
        <AcoesDoItem
          colecao="posts"
          id={post.id}
          nome={post.titulo}
          situacao={situacao}
          hrefEditar={`/admin/blog/editar/${post.id}`}
          hrefNoSite={post.slug ? `/blog/${post.slug}` : null}
          podeExcluirDeVez={podeExcluirDeVez}
          podeDuplicar
          prefixoDaCopia="/admin/blog/editar/"
          perdas={PERDAS}
        />
      ),
    };
  });

  return (
    <div>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Blog" }]}
        titulo="Blog"
        descricao={`Posts do blog. Só os publicados aparecem no site; os da lixeira voltam como rascunho se forem restaurados.${podeExcluirDeVez ? "" : " Só o administrador exclui de vez."} Categorias e tags ficam em Blog: categorias e tags.`}
        acao={<Botao href="/admin/blog/novo">Adicionar post</Botao>}
      />
      <MensagensDoPainel>
        <ListaDoPainel
          colecao="posts"
          itens={itens}
          colunas={["Título", "Situação", "Criado em"]}
          ordenacoes={ORDENACOES}
          rotulos={{ singular: "post", plural: "posts", publicados: "Publicados", rascunhos: "Rascunhos" }}
          rotuloDaBusca="Buscar pelo título"
          comSituacao
          estadoVazio={
            <>
              <p className="tipo-texto">Nenhum post ainda. O primeiro post publicado aparece em /blog.</p>
              <Botao href="/admin/blog/novo" variante="secundario">Adicionar o primeiro post</Botao>
            </>
          }
        />
      </MensagensDoPainel>
    </div>
  );
}
