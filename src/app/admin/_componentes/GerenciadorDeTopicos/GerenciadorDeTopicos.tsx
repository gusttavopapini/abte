"use client";

import { useActionState, useId } from "react";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { AcoesDoItem, type OperacoesDoItem, type TextosDoItem } from "@/app/admin/_componentes/AcoesDoItem/AcoesDoItem";
import { ImagemDoItem, type EscolhaDeImagem } from "@/app/admin/_componentes/ImagemDoItem/ImagemDoItem";
import { MensagensDoPainel } from "@/app/admin/_componentes/MensagensDoPainel/MensagensDoPainel";
import { SeloStatus } from "@/app/admin/_componentes/SeloStatus/SeloStatus";
import { excluirItemDeVez, publicarOuDespublicar } from "@/app/admin/acoes-lixeira";
import { atualizarTopico, criarTopico, moverTopicoParaALixeira, restaurarTopicoDaLixeira, type RespostaDoTopico } from "@/app/admin/acoes-topicos";
import type { TipoDeTopico } from "@/lib/dados/tipos";
import type { ColecaoDoPainel } from "@/lib/lixeira";
import estilos from "./GerenciadorDeTopicos.module.css";

// imagem: só nas categorias (null sem imagem; imagem null dentro: foi para a lixeira).
// ativa: só usada nas categorias de artigo e de post (ausente no documento vale true).
export type TopicoNaTela = { id: string; nome: string; slug: string; ordem: number; imagem: EscolhaDeImagem; ativa: boolean };

type Props = {
  tipo: TipoDeTopico;
  // Com ordem de exibição (categorias) ou sem (tags).
  comOrdem?: boolean;
  // Com imagem da biblioteca de mídia (categorias) ou sem (tags).
  comImagem?: boolean;
  // Com o controle "Ativa" (categorias de artigo desde 23/10/2026 e de post desde 25/10/2026).
  comAtiva?: boolean;
  // Onde a imagem aparece no site, para a ajuda do campo.
  ondeAparece?: string;
  // Início do endereço público do tópico, mostrado no painel (ex.: "/artigos/categoria/").
  prefixoDoEndereco?: string;
  titulo: string;
  descricao: string;
  ativos: TopicoNaTela[];
  excluidos: TopicoNaTela[];
  // Só o administrador exclui de vez (tabela PERMISSOES).
  podeExcluirDeVez?: boolean;
};

const COLECAO_DO_TIPO: Record<TipoDeTopico, ColecaoDoPainel> = {
  categoria: "categoriasDeArtigos",
  tag: "tagsDeArtigos",
  categoriaDePost: "categoriasDePosts",
  tagDePost: "tagsDePosts",
  categoriaDeProduto: "categoriasDeProdutos",
};

const ehTag = (tipo: TipoDeTopico) => tipo === "tag" || tipo === "tagDePost";

// Menu "Ações" de um tópico (04/11/2026): ativar e desativar só onde o campo
// ativa existe; lixeira e restaurar com as regras dos tópicos (em uso não vai
// para a lixeira; nome repetido não é restaurado); excluir de vez pelas ações
// comuns, recusado se o tópico estiver em uso.
function MenuDoTopico({ tipo, topico, naLixeira, comAtiva, prefixoDoEndereco, podeExcluirDeVez }: { tipo: TipoDeTopico; topico: TopicoNaTela; naLixeira: boolean; comAtiva: boolean; prefixoDoEndereco?: string; podeExcluirDeVez: boolean }) {
  const colecao = COLECAO_DO_TIPO[tipo];
  const operacoes: OperacoesDoItem = {
    mudarSituacao: comAtiva ? (ligar) => publicarOuDespublicar(colecao, topico.id, ligar) : undefined,
    moverParaLixeira: () => moverTopicoParaALixeira(tipo, topico.id),
    restaurar: () => restaurarTopicoDaLixeira(tipo, topico.id),
    excluirDeVez: (confirmacao) => excluirItemDeVez(colecao, topico.id, confirmacao),
  };
  const textos: TextosDoItem = { artigo: "a", nome: ehTag(tipo) ? "tag" : "categoria", ligar: comAtiva ? "Ativar" : null, desligar: comAtiva ? "Desativar" : null, voltaComoRascunho: false };
  const perdas = ehTag(tipo)
    ? ["O nome desta tag.", "Ela só pode ser excluída de vez se nenhum item a usa."]
    : ["O nome, a ordem e o endereço desta categoria.", "Ela só pode ser excluída de vez se nenhum item a usa.", "A imagem não é apagada: continua na biblioteca de mídia."];
  return (
    <AcoesDoItem
      operacoes={operacoes}
      textos={textos}
      id={topico.id}
      nome={topico.nome}
      situacao={naLixeira ? "lixeira" : !comAtiva || topico.ativa ? "publicado" : "rascunho"}
      abrirNaLixeira={false}
      hrefNoSite={prefixoDoEndereco ? `${prefixoDoEndereco}${topico.slug}` : null}
      podeExcluirDeVez={podeExcluirDeVez}
      perdas={perdas}
    />
  );
}

// Resposta da última ação de um formulário, em caixa branca de erro ou sucesso.
function Resposta({ resposta }: { resposta: RespostaDoTopico | null }) {
  if (!resposta) return null;
  return <Mensagem tipo={resposta.ok ? "sucesso" : "erro"}>{resposta.mensagem}</Mensagem>;
}

function NovoTopico({ tipo, comOrdem, comImagem }: { tipo: TipoDeTopico; comOrdem: boolean; comImagem: boolean }) {
  const [resposta, acao, pendente] = useActionState(criarTopico, null);
  const id = useId();
  return (
    <form action={acao} className={estilos.caixa}>
      <input type="hidden" name="tipo" value={tipo} />
      <div className={estilos.campos}>
        <Campo id={`${id}-nome`} name="nome" rotulo={tipo === "tag" || tipo === "tagDePost" ? "Nova tag" : "Nova categoria"} obrigatorio maxLength={60} />
        {comOrdem && <Campo id={`${id}-ordem`} name="ordem" type="number" rotulo="Ordem" min={0} max={999} defaultValue={0} />}
      </div>
      {comImagem && <p className={estilos.endereco}>A imagem pode ser escolhida depois de criar a categoria, na lista abaixo.</p>}
      <div className={estilos.botoes}>
        <Botao type="submit" disabled={pendente}>{pendente ? "Adicionando..." : "Adicionar"}</Botao>
      </div>
      <Resposta resposta={resposta} />
    </form>
  );
}

type PropsDoItem = {
  tipo: TipoDeTopico;
  topico: TopicoNaTela;
  comOrdem: boolean;
  comImagem: boolean;
  comAtiva: boolean;
  ondeAparece?: string;
  prefixoDoEndereco?: string;
  podeExcluirDeVez: boolean;
};

function ItemAtivo({ tipo, topico, comOrdem, comImagem, comAtiva, ondeAparece, prefixoDoEndereco, podeExcluirDeVez }: PropsDoItem) {
  const [respostaSalvar, salvar, salvando] = useActionState(atualizarTopico, null);
  const id = useId();
  return (
    <li className={estilos.caixa}>
      {comAtiva && (
        <p className={estilos.situacao}>
          <SeloStatus status={topico.ativa ? "ativo" : "inativo"} />
        </p>
      )}
      <form id={`${id}-salvar`} action={salvar}>
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="id" value={topico.id} />
        <div className={estilos.campos}>
          <Campo id={`${id}-nome`} name="nome" rotulo="Nome" obrigatorio maxLength={60} defaultValue={topico.nome} />
          {comOrdem && (
            <Campo id={`${id}-ordem`} name="ordem" type="number" rotulo="Ordem" min={0} max={999} defaultValue={topico.ordem} />
          )}
        </div>
        {prefixoDoEndereco && <p className={estilos.endereco}>Endereço: {prefixoDoEndereco}{topico.slug}</p>}
        {comAtiva && (
          <>
            {/* Diz ao servidor que o controle estava na tela: desmarcado, a caixa não manda nada. */}
            <input type="hidden" name="ativaNoFormulario" value="sim" />
            <label className={estilos.opcao}>
              <input type="checkbox" name="ativa" value="sim" defaultChecked={topico.ativa} />
              {tipo === "categoriaDePost"
                ? "Ativa (desmarcada, a categoria some dos filtros de /blog, mas continua no painel e nos posts que a usam)"
                : "Ativa (desmarcada, a categoria some de /artigos, mas continua no painel e nos artigos que a usam)"}
            </label>
          </>
        )}
        {comImagem && (
          <div className={estilos.imagem}>
            <ImagemDoItem
              nome="imagemMidiaId"
              rotulo={`Imagem${ondeAparece ? ` (${ondeAparece})` : ""}`}
              inicial={topico.imagem}
              dono={{ tipo: tipo === "categoriaDeProduto" ? "categoriaDeProduto" : "categoriaDeArtigo", id: topico.id, campo: "imagem" }}
              proporcao={tipo === "categoriaDeProduto" ? "1:1, quadrada" : "16:9 (aparece assim no card da categoria)"}
            />
          </div>
        )}
      </form>
      {/* Salvar pertence ao formulário acima (atributo form); as outras ações ficam no menu. */}
      <div className={estilos.botoes}>
        <Botao type="submit" form={`${id}-salvar`} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Botao>
        <MenuDoTopico tipo={tipo} topico={topico} naLixeira={false} comAtiva={comAtiva} prefixoDoEndereco={prefixoDoEndereco} podeExcluirDeVez={podeExcluirDeVez} />
      </div>
      <Resposta resposta={respostaSalvar} />
    </li>
  );
}

function ItemNaLixeira({ tipo, topico, comAtiva, podeExcluirDeVez }: { tipo: TipoDeTopico; topico: TopicoNaTela; comAtiva: boolean; podeExcluirDeVez: boolean }) {
  return (
    <li className={`${estilos.caixa} ${estilos.linhaExcluido}`}>
      <span className={estilos.nomeNaLixeira}>
        {topico.nome}
        <SeloStatus status="lixeira" />
      </span>
      <MenuDoTopico tipo={tipo} topico={topico} naLixeira comAtiva={comAtiva} podeExcluirDeVez={podeExcluirDeVez} />
    </li>
  );
}

// Cadastro de um tipo de tópico (artigos, posts ou loja): criar, renomear e,
// pelo menu "Ações", ativar, mover para a lixeira, restaurar e excluir de vez.
export function GerenciadorDeTopicos({ tipo, comOrdem = false, comImagem = false, comAtiva = false, ondeAparece, prefixoDoEndereco, titulo, descricao, ativos, excluidos, podeExcluirDeVez = false }: Props) {
  const idTitulo = useId();
  const nomeDoTipo = ehTag(tipo) ? "tags" : "categorias";
  return (
    <section aria-labelledby={idTitulo} className={estilos.secao}>
      <h2 id={idTitulo} className="tipo-h3">{titulo}</h2>
      <p className="tipo-texto">{descricao}</p>

      <MensagensDoPainel>
        <NovoTopico tipo={tipo} comOrdem={comOrdem} comImagem={comImagem} />

        {ativos.length === 0 ? (
          <p className="tipo-texto">Nenhum item fora da lixeira.</p>
        ) : (
          <ul role="list" className={estilos.lista}>
            {ativos.map((topico) => (
              <ItemAtivo
                key={topico.id}
                tipo={tipo}
                topico={topico}
                comOrdem={comOrdem}
                comImagem={comImagem}
                comAtiva={comAtiva}
                ondeAparece={ondeAparece}
                prefixoDoEndereco={prefixoDoEndereco}
                podeExcluirDeVez={podeExcluirDeVez}
              />
            ))}
          </ul>
        )}

        <h3 className="tipo-texto-lg">Lixeira ({excluidos.length})</h3>
        {excluidos.length === 0 ? (
          <p className="tipo-texto">Nenhum item na lixeira.</p>
        ) : (
          <>
            <p className="tipo-texto">
              {`${nomeDoTipo.charAt(0).toUpperCase()}${nomeDoTipo.slice(1)} na lixeira não aparecem no site. Restaurar volta o item como estava.`}
              {podeExcluirDeVez ? " Excluir de vez não tem volta." : " Só o administrador exclui de vez."}
            </p>
            <ul role="list" className={estilos.lista}>
              {excluidos.map((topico) => (
                <ItemNaLixeira key={topico.id} tipo={tipo} topico={topico} comAtiva={comAtiva} podeExcluirDeVez={podeExcluirDeVez} />
              ))}
            </ul>
          </>
        )}
      </MensagensDoPainel>
    </section>
  );
}
