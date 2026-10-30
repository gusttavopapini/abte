import type { Metadata } from "next";
import Link from "next/link";
import { BuscaNaTabela } from "@/app/admin/_componentes/BuscaNaTabela/BuscaNaTabela";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { CelulaDoPainel, LinhaDoPainel, TabelaPainel } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
import { Botao } from "@/components/Botao/Botao";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerPosts } from "@/lib/dados/colecoes";

export const metadata: Metadata = { title: "Blog" };

const SITUACOES_DE_PUBLICACAO = [
  { valor: "publicado", rotulo: "Publicados" },
  { valor: "rascunho", rotulo: "Rascunhos" },
];

export default async function PaginaAdminBlog() {
  await exigirPapelDoPainel();
  const snapshot = await lerPosts().orderBy("criadoEm", "desc").get();
  const posts = snapshot.docs.map((documento) => documento.data());

  return (
    <div>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Blog" }]}
        titulo="Blog"
        descricao="Posts do blog, publicados e rascunhos. Só os publicados aparecem no site; categorias e tags ficam em Blog: categorias e tags."
        acao={<Botao href="/admin/blog/novo">Adicionar post</Botao>}
      />

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
            <p className="tipo-texto">Nenhum post ainda. O primeiro post publicado aparece em /blog.</p>
            <Botao href="/admin/blog/novo" variante="secundario">Adicionar o primeiro post</Botao>
          </>
        }
      >
        {posts.map((post) => (
          <LinhaDoPainel key={post.id} busca={post.titulo} situacao={post.status}>
            <CelulaDoPainel rotulo="Título" destaque>{post.titulo}</CelulaDoPainel>
            <CelulaDoPainel rotulo="Situação"><SeloStatus status={post.status} /></CelulaDoPainel>
            <CelulaDoPainel rotulo="Criado em">{post.criadoEm ? post.criadoEm.toLocaleDateString("pt-BR") : "Sem data"}</CelulaDoPainel>
            <CelulaDoPainel rotulo="Ações" acoes>
              <Link href={`/admin/blog/editar/${post.id}`} className="realce" aria-label={`Editar o post ${post.titulo}`}>
                Editar
              </Link>
            </CelulaDoPainel>
          </LinhaDoPainel>
        ))}
      </TabelaPainel>
    </div>
  );
}
