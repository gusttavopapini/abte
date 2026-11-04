import type { Metadata } from "next";
import { AcoesDoItem } from "@/app/admin/_componentes/AcoesDoItem/AcoesDoItem";
import { BuscaNaTabela } from "@/app/admin/_componentes/BuscaNaTabela/BuscaNaTabela";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { MensagensDoPainel } from "@/app/admin/_componentes/MensagensDoPainel/MensagensDoPainel";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { CelulaDoPainel, LinhaDoPainel, TabelaPainel } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
import { Botao } from "@/components/Botao/Botao";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerPosts } from "@/lib/dados/colecoes";
import type { Post } from "@/lib/dados/tipos";
import { situacaoDoItem } from "@/lib/lixeira";
import estilos from "../listaComLixeira.module.css";

export const metadata: Metadata = { title: "Blog" };

const SITUACOES_DE_PUBLICACAO = [
  { valor: "publicado", rotulo: "Publicados" },
  { valor: "rascunho", rotulo: "Rascunhos" },
];

// O que se perde ao excluir um post de vez (texto da confirmação reforçada).
const PERDAS = [
  "O título, o texto, a categoria e as tags deste post.",
  "O endereço do post no blog deixa de existir.",
  "As imagens não são apagadas: continuam na biblioteca de mídia.",
];

export default async function PaginaAdminBlog() {
  const usuario = await exigirPapelDoPainel();
  const podeExcluirDeVez = papelPodeExecutar(usuario.papel, "conteudo.excluirDeVez");
  const snapshot = await lerPosts().orderBy("criadoEm", "desc").get();
  const todos = snapshot.docs.map((documento) => documento.data());
  const posts = todos.filter((post) => !post.excluidoEm);
  const naLixeira = todos.filter((post) => post.excluidoEm);

  const acoes = (post: Post) => (
    <AcoesDoItem
      colecao="posts"
      id={post.id}
      nome={post.titulo}
      situacao={situacaoDoItem("posts", { status: post.status, excluidoEm: post.excluidoEm })}
      hrefEditar={`/admin/blog/editar/${post.id}`}
      hrefNoSite={post.slug ? `/blog/${post.slug}` : null}
      podeExcluirDeVez={podeExcluirDeVez}
      podeDuplicar
      prefixoDaCopia="/admin/blog/editar/"
      perdas={PERDAS}
    />
  );

  return (
    <div>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Blog" }]}
        titulo="Blog"
        descricao="Posts do blog, publicados e rascunhos. Só os publicados aparecem no site; categorias e tags ficam em Blog: categorias e tags."
        acao={<Botao href="/admin/blog/novo">Adicionar post</Botao>}
      />

      <MensagensDoPainel>
        {posts.length > 0 && (
          <BuscaNaTabela tabela="tabela-posts" rotuloDaBusca="Buscar pelo título" situacoes={SITUACOES_DE_PUBLICACAO} total={posts.length} nomeNoSingular="post" nomeNoPlural="posts" />
        )}
        <TabelaPainel
          id="tabela-posts"
          legenda="Mais recentes primeiro (pela data de criação)."
          colunas={["Título", "Situação", "Criado em", "Ações"]}
          vazia={posts.length === 0}
          estadoVazio={
            <>
              <p className="tipo-texto">Nenhum post fora da lixeira. O primeiro post publicado aparece em /blog.</p>
              <Botao href="/admin/blog/novo" variante="secundario">Adicionar um post</Botao>
            </>
          }
        >
          {posts.map((post) => (
            <LinhaDoPainel key={post.id} busca={post.titulo} situacao={post.status}>
              <CelulaDoPainel rotulo="Título" destaque>{post.titulo}</CelulaDoPainel>
              <CelulaDoPainel rotulo="Situação"><SeloStatus status={post.status} /></CelulaDoPainel>
              <CelulaDoPainel rotulo="Criado em">{post.criadoEm ? post.criadoEm.toLocaleDateString("pt-BR") : "Sem data"}</CelulaDoPainel>
              <CelulaDoPainel rotulo="Ações" acoes>{acoes(post)}</CelulaDoPainel>
            </LinhaDoPainel>
          ))}
        </TabelaPainel>

        {naLixeira.length > 0 && (
          <section className={estilos.lixeira} aria-labelledby="titulo-lixeira-posts">
            <h2 id="titulo-lixeira-posts" className={estilos.titulo}>Lixeira ({naLixeira.length})</h2>
            <TabelaPainel
              legenda={`Posts na lixeira não aparecem no site. Restaurar volta o post como rascunho.${podeExcluirDeVez ? " Excluir de vez não tem volta." : " Só o administrador exclui de vez."}`}
              colunas={["Título", "Situação", "Na lixeira desde", "Ações"]}
              vazia={false}
              estadoVazio={null}
            >
              {naLixeira.map((post) => (
                <LinhaDoPainel key={post.id} busca={post.titulo}>
                  <CelulaDoPainel rotulo="Título" destaque>{post.titulo}</CelulaDoPainel>
                  <CelulaDoPainel rotulo="Situação"><SeloStatus status="lixeira" /></CelulaDoPainel>
                  <CelulaDoPainel rotulo="Na lixeira desde">{post.excluidoEm ? post.excluidoEm.toLocaleDateString("pt-BR") : "Sem data"}</CelulaDoPainel>
                  <CelulaDoPainel rotulo="Ações" acoes>{acoes(post)}</CelulaDoPainel>
                </LinhaDoPainel>
              ))}
            </TabelaPainel>
          </section>
        )}
      </MensagensDoPainel>
    </div>
  );
}
