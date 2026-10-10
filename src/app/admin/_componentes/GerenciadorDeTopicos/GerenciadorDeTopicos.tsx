"use client";

import { useActionState, useId } from "react";
import { Botao } from "@/components/Botao/Botao";
import { Campo } from "@/components/Campo/Campo";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import {
  atualizarTopico,
  criarTopico,
  excluirTopico,
  restaurarTopico,
  type RespostaDoTopico,
} from "@/app/admin/acoes-topicos";
import type { TipoDeTopico } from "@/lib/dados/tipos";
import estilos from "./GerenciadorDeTopicos.module.css";

export type TopicoNaTela = { id: string; nome: string; slug: string; ordem: number };

type Props = {
  tipo: TipoDeTopico;
  // Com ordem de exibição (categorias) ou sem (tags).
  comOrdem?: boolean;
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

function NovoTopico({ tipo, comOrdem }: { tipo: TipoDeTopico; comOrdem: boolean }) {
  const [resposta, acao, pendente] = useActionState(criarTopico, null);
  const id = useId();
  return (
    <form action={acao} className={estilos.caixa}>
      <input type="hidden" name="tipo" value={tipo} />
      <div className={estilos.campos}>
        <Campo id={`${id}-nome`} name="nome" rotulo={tipo === "tag" ? "Nova tag" : "Nova categoria"} obrigatorio maxLength={60} />
        {comOrdem && <Campo id={`${id}-ordem`} name="ordem" type="number" rotulo="Ordem" min={0} max={999} defaultValue={0} />}
      </div>
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

type PropsDoItem = { tipo: TipoDeTopico; topico: TopicoNaTela; excluir: AcaoDaSecao; comOrdem: boolean; prefixoDoEndereco?: string };

function ItemAtivo({ tipo, topico, excluir, comOrdem, prefixoDoEndereco }: PropsDoItem) {
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

// Cadastro de um tipo de tópico dos artigos: criar, renomear, excluir (vai
// para os excluídos) e restaurar.
export function GerenciadorDeTopicos({ tipo, comOrdem = false, prefixoDoEndereco, titulo, descricao, ativos, excluidos }: Props) {
  const idTitulo = useId();
  const [respostaExcluir, acaoExcluir, excluindo] = useActionState(excluirTopico, null);
  const [respostaRestaurar, acaoRestaurar, restaurando] = useActionState(restaurarTopico, null);
  const excluir = { acao: acaoExcluir, pendente: excluindo };
  const restaurar = { acao: acaoRestaurar, pendente: restaurando };
  return (
    <section aria-labelledby={idTitulo} className={estilos.secao}>
      <h2 id={idTitulo} className="tipo-h3">{titulo}</h2>
      <p className="tipo-texto">{descricao}</p>

      <NovoTopico tipo={tipo} comOrdem={comOrdem} />

      {ativos.length === 0 ? (
        <p className="tipo-texto">Nenhum item cadastrado ainda.</p>
      ) : (
        <ul role="list" className={estilos.lista}>
          {ativos.map((topico) => (
            <ItemAtivo key={topico.id} tipo={tipo} topico={topico} excluir={excluir} comOrdem={comOrdem} prefixoDoEndereco={prefixoDoEndereco} />
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
