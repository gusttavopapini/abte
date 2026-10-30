import type { Metadata } from "next";
import Link from "next/link";
import { BuscaNaTabela } from "@/app/admin/_componentes/BuscaNaTabela/BuscaNaTabela";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { CelulaDoPainel, LinhaDoPainel, TabelaPainel } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
import { Botao } from "@/components/Botao/Botao";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerArtigos, lerTopicos } from "@/lib/dados/colecoes";

export const metadata: Metadata = { title: "Artigos" };

export default async function PaginaAdminArtigos() {
  await exigirPapelDoPainel();
  const snapshot = await lerArtigos().orderBy("criadoEm", "desc").get();
  const artigos = snapshot.docs.map((documento) => documento.data());
  // Nome de cada categoria pelo id (inclusive as que estão nos excluídos).
  const categorias = new Map((await lerTopicos("categoria").get()).docs.map((documento) => [documento.id, documento.data().nome]));

  return (
    <div>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Artigos" }]}
        titulo="Artigos científicos"
        descricao="Artigos publicados e rascunhos. Só os publicados aparecem em /artigos; categorias e tags ficam em Artigos: categorias e tags."
        acao={<Botao href="/admin/artigos/novo">Adicionar artigo</Botao>}
      />

      {artigos.length > 0 && (
        <BuscaNaTabela
          tabela="tabela-artigos"
          rotuloDaBusca="Buscar pelo título ou categoria"
          situacoes={[{ valor: "publicado", rotulo: "Publicados" }, { valor: "rascunho", rotulo: "Rascunhos" }]}
          total={artigos.length}
          nomeNoSingular="artigo"
          nomeNoPlural="artigos"
        />
      )}
      <TabelaPainel
        id="tabela-artigos"
        legenda="Mais recentes primeiro (pela data de criação)."
        colunas={["Título", "Categoria", "Situação", "Ações"]}
        vazia={artigos.length === 0}
        estadoVazio={
          <>
            <p className="tipo-texto">Nenhum artigo ainda. Cada artigo precisa de uma categoria: cadastre antes em Artigos: categorias e tags.</p>
            <Botao href="/admin/artigos/novo" variante="secundario">Adicionar o primeiro artigo</Botao>
          </>
        }
      >
        {artigos.map((artigo) => {
          const categoria = categorias.get(artigo.categoria) ?? "Sem categoria";
          return (
            <LinhaDoPainel key={artigo.id} busca={`${artigo.titulo} ${categoria}`} situacao={artigo.status}>
              <CelulaDoPainel rotulo="Título" destaque>{artigo.titulo}</CelulaDoPainel>
              <CelulaDoPainel rotulo="Categoria">{categoria}</CelulaDoPainel>
              <CelulaDoPainel rotulo="Situação"><SeloStatus status={artigo.status} /></CelulaDoPainel>
              <CelulaDoPainel rotulo="Ações" acoes>
                <Link href={`/admin/artigos/editar/${artigo.id}`} className="realce" aria-label={`Editar o artigo ${artigo.titulo}`}>
                  Editar
                </Link>
              </CelulaDoPainel>
            </LinhaDoPainel>
          );
        })}
      </TabelaPainel>
    </div>
  );
}
