"use client";

import { useActionState, useId } from "react";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { SeletorDeMidia, type EscolhaDeMidia } from "@/app/admin/_componentes/SeletorDeMidia/SeletorDeMidia";
import {
  atualizarTopico,
  criarTopico,
  excluirTopico,
  restaurarTopico,
  type RespostaDoTopico,
} from "@/app/admin/acoes-topicos";
import type { TipoDeTopico } from "@/lib/dados/tipos";
import estilos from "./GerenciadorDeTopicos.module.css";

// imagem: só nas categorias (null sem imagem; imagem null dentro: foi para a lixeira).
// ativa: só usada nas categorias de artigo e de post (ausente no documento vale true).
export type TopicoNaTela = { id: string; nome: string; slug: string; ordem: number; imagem: EscolhaDeMidia; ativa: boolean };

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
};

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

// Ação de excluir ou restaurar, criada na seção: o item sai da lista depois da
// ação, e a resposta precisa continuar visível.
type AcaoDaSecao = { acao: (dados: FormData) => void; pendente: boolean };

type PropsDoItem = {
  tipo: TipoDeTopico;
  topico: TopicoNaTela;
  excluir: AcaoDaSecao;
  comOrdem: boolean;
  comImagem: boolean;
  comAtiva: boolean;
  ondeAparece?: string;
  prefixoDoEndereco?: string;
};

function ItemAtivo({ tipo, topico, excluir, comOrdem, comImagem, comAtiva, ondeAparece, prefixoDoEndereco }: PropsDoItem) {
  const [respostaSalvar, salvar, salvando] = useActionState(atualizarTopico, null);
  const id = useId();
  return (
    <li className={estilos.caixa}>
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
            <SeletorDeMidia nome="imagemMidiaId" rotulo={`Imagem${ondeAparece ? ` (${ondeAparece})` : ""}`} inicial={topico.imagem} />
          </div>
        )}
      </form>
      {/* Salvar pertence ao formulário acima (atributo form); Excluir tem o próprio formulário. */}
      <div className={estilos.botoes}>
        <Botao type="submit" form={`${id}-salvar`} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Botao>
        <form action={excluir.acao}>
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="id" value={topico.id} />
          <Botao type="submit" variante="secundario" disabled={excluir.pendente} aria-label={`Excluir ${topico.nome}`}>
            Excluir
          </Botao>
        </form>
      </div>
      <Resposta resposta={respostaSalvar} />
    </li>
  );
}

function ItemExcluido({ tipo, topico, restaurar }: { tipo: TipoDeTopico; topico: TopicoNaTela; restaurar: AcaoDaSecao }) {
  return (
    <li className={estilos.caixa}>
      <form action={restaurar.acao} className={estilos.linhaExcluido}>
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="id" value={topico.id} />
        <span>{topico.nome}</span>
        <Botao type="submit" variante="secundario" disabled={restaurar.pendente} aria-label={`Restaurar ${topico.nome}`}>
          Restaurar
        </Botao>
      </form>
    </li>
  );
}

// Cadastro de um tipo de tópico (artigos, posts ou loja): criar, renomear, excluir (vai
// para os excluídos) e restaurar.
export function GerenciadorDeTopicos({ tipo, comOrdem = false, comImagem = false, comAtiva = false, ondeAparece, prefixoDoEndereco, titulo, descricao, ativos, excluidos }: Props) {
  const idTitulo = useId();
  const [respostaExcluir, acaoExcluir, excluindo] = useActionState(excluirTopico, null);
  const [respostaRestaurar, acaoRestaurar, restaurando] = useActionState(restaurarTopico, null);
  const excluir = { acao: acaoExcluir, pendente: excluindo };
  const restaurar = { acao: acaoRestaurar, pendente: restaurando };
  return (
    <section aria-labelledby={idTitulo} className={estilos.secao}>
      <h2 id={idTitulo} className="tipo-h3">{titulo}</h2>
      <p className="tipo-texto">{descricao}</p>

      <NovoTopico tipo={tipo} comOrdem={comOrdem} comImagem={comImagem} />

      {ativos.length === 0 ? (
        <p className="tipo-texto">Nenhum item cadastrado ainda.</p>
      ) : (
        <ul role="list" className={estilos.lista}>
          {ativos.map((topico) => (
            <ItemAtivo
              key={topico.id}
              tipo={tipo}
              topico={topico}
              excluir={excluir}
              comOrdem={comOrdem}
              comImagem={comImagem}
              comAtiva={comAtiva}
              ondeAparece={ondeAparece}
              prefixoDoEndereco={prefixoDoEndereco}
            />
          ))}
        </ul>
      )}
      <Resposta resposta={respostaExcluir} />

      <h3 className="tipo-texto-lg">Excluídos</h3>
      {excluidos.length === 0 ? (
        <p className="tipo-texto">Nenhum item excluído.</p>
      ) : (
        <ul role="list" className={estilos.lista}>
          {excluidos.map((topico) => (
            <ItemExcluido key={topico.id} tipo={tipo} topico={topico} restaurar={restaurar} />
          ))}
        </ul>
      )}
      <Resposta resposta={respostaRestaurar} />
    </section>
  );
}
