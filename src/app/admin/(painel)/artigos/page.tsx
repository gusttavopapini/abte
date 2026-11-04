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
import { lerArtigos, lerTopicos } from "@/lib/dados/colecoes";
import { lerConfiguracaoDoSiteEmCache } from "@/lib/dados/site";
import type { Artigo } from "@/lib/dados/tipos";
import { situacaoDoItem } from "@/lib/lixeira";
import estilos from "../listaComLixeira.module.css";

export const metadata: Metadata = { title: "Artigos" };

// O que se perde ao excluir um artigo de vez (texto da confirmação reforçada).
const PERDAS = [
  "O título, os autores, o resumo, o link, a categoria e as tags deste artigo.",
  "O endereço do artigo no site deixa de existir.",
  "A imagem não é apagada: continua na biblioteca de mídia.",
];

export default async function PaginaAdminArtigos() {
  const usuario = await exigirPapelDoPainel();
  const podeExcluirDeVez = papelPodeExecutar(usuario.papel, "conteudo.excluirDeVez");
  const snapshot = await lerArtigos().orderBy("criadoEm", "desc").get();
  const todos = snapshot.docs.map((documento) => documento.data());
  const artigos = todos.filter((artigo) => !artigo.excluidoEm);
  const naLixeira = todos.filter((artigo) => artigo.excluidoEm);
  // Nome de cada categoria pelo id (inclusive as que estão nos excluídos).
  const categorias = new Map((await lerTopicos("categoria").get()).docs.map((documento) => [documento.id, documento.data().nome]));
  // Com os artigos desligados nas configurações, as páginas públicas dão 404.
  const artigosNoSite = (await lerConfiguracaoDoSiteEmCache()).artigosAtivo;

  const acoes = (artigo: Artigo) => (
    <AcoesDoItem
      colecao="artigos"
      id={artigo.id}
      nome={artigo.titulo}
      situacao={situacaoDoItem("artigos", { status: artigo.status, excluidoEm: artigo.excluidoEm })}
      hrefEditar={`/admin/artigos/editar/${artigo.id}`}
      hrefNoSite={artigosNoSite ? `/artigos/${artigo.id}` : null}
      podeExcluirDeVez={podeExcluirDeVez}
      podeDuplicar
      prefixoDaCopia="/admin/artigos/editar/"
      perdas={PERDAS}
    />
  );

  return (
    <div>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Artigos" }]}
        titulo="Artigos científicos"
        descricao="Artigos publicados e rascunhos. Só os publicados aparecem em /artigos; categorias e tags ficam em Artigos: categorias e tags."
        acao={<Botao href="/admin/artigos/novo">Adicionar artigo</Botao>}
      />

      <MensagensDoPainel>
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
              <p className="tipo-texto">Nenhum artigo fora da lixeira. Cada artigo precisa de uma categoria: cadastre antes em Artigos: categorias e tags.</p>
              <Botao href="/admin/artigos/novo" variante="secundario">Adicionar um artigo</Botao>
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
                <CelulaDoPainel rotulo="Ações" acoes>{acoes(artigo)}</CelulaDoPainel>
              </LinhaDoPainel>
            );
          })}
        </TabelaPainel>

        {naLixeira.length > 0 && (
          <section className={estilos.lixeira} aria-labelledby="titulo-lixeira-artigos">
            <h2 id="titulo-lixeira-artigos" className={estilos.titulo}>Lixeira ({naLixeira.length})</h2>
            <TabelaPainel
              legenda={`Artigos na lixeira não aparecem no site. Restaurar volta o artigo como rascunho.${podeExcluirDeVez ? " Excluir de vez não tem volta." : " Só o administrador exclui de vez."}`}
              colunas={["Título", "Categoria", "Situação", "Ações"]}
              vazia={false}
              estadoVazio={null}
            >
              {naLixeira.map((artigo) => (
                <LinhaDoPainel key={artigo.id} busca={artigo.titulo}>
                  <CelulaDoPainel rotulo="Título" destaque>{artigo.titulo}</CelulaDoPainel>
                  <CelulaDoPainel rotulo="Categoria">{categorias.get(artigo.categoria) ?? "Sem categoria"}</CelulaDoPainel>
                  <CelulaDoPainel rotulo="Situação"><SeloStatus status="lixeira" /></CelulaDoPainel>
                  <CelulaDoPainel rotulo="Ações" acoes>{acoes(artigo)}</CelulaDoPainel>
                </LinhaDoPainel>
              ))}
            </TabelaPainel>
          </section>
        )}
      </MensagensDoPainel>
    </div>
  );
}
