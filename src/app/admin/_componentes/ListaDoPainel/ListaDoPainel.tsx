"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { aplicarAcaoEmLote } from "@/app/admin/acoes-lixeira";
import { Botao } from "@/components/Botao/Botao";
import type { AcaoEmLote, ColecaoDoPainel, Situacao } from "@/lib/lixeira";
import { ConfirmacaoDoPainel } from "../ConfirmacaoDoPainel/ConfirmacaoDoPainel";
import { useAvisarNoPainel } from "../MensagensDoPainel/MensagensDoPainel";
import { CelulaDoPainel, TabelaPainel } from "../TabelaPainel/TabelaPainel";
import estilos from "./ListaDoPainel.module.css";

export type ItemDaLista = {
  id: string;
  // Nome do item: busca e rótulo da caixa de seleção.
  nome: string;
  // Texto a mais para a busca (categoria, tipo, local...).
  busca?: string;
  situacao: Situacao;
  // Valores para ordenar (ex.: { criadoEm: 1730000000000, nome: "..." }).
  chaves: Record<string, string | number>;
  // Uma célula por coluna (sem a seleção e sem as ações).
  celulas: ReactNode[];
  acoes: ReactNode;
};

export type OrdenacaoDaLista = { valor: string; rotulo: string; chave: string; direcao: "asc" | "desc" };

export type RotulosDaLista = { singular: string; plural: string; publicados: string; rascunhos: string };

type Filtro = "todos" | "publicado" | "rascunho" | "lixeira";

type Props = {
  colecao: ColecaoDoPainel;
  itens: ItemDaLista[];
  colunas: string[];
  // A primeira é a padrão.
  ordenacoes: OrdenacaoDaLista[];
  rotulos: RotulosDaLista;
  rotuloDaBusca: string;
  // Sem nenhum item na coleção: explicação e botão.
  estadoVazio: ReactNode;
  // Itens com situação de publicação (despublicar em lote).
  comSituacao: boolean;
};

const POR_PAGINA = 20;

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function lerFiltro(valor: string | null): Filtro {
  return valor === "publicado" || valor === "rascunho" || valor === "lixeira" ? valor : "todos";
}

// Lista das telas do painel (etapa 2, 04/11/2026): filtro de situação com
// contagem (Todos, fora da lixeira; Publicados; Rascunhos; Lixeira), busca
// que também procura na lixeira, ordenação, "Mostrar mais" de 20 em 20 e
// seleção de várias linhas com ações em lote (despublicar, mover para a
// lixeira e restaurar), sempre com confirmação e resumo do resultado. O
// filtro, a busca e a ordem ficam no endereço (voltar e recarregar mantêm).
export function ListaDoPainel({ colecao, itens, colunas, ordenacoes, rotulos, rotuloDaBusca, estadoVazio, comSituacao }: Props) {
  const router = useRouter();
  const parametros = useSearchParams();
  const avisar = useAvisarNoPainel();
  const id = useId();
  const [filtro, setFiltro] = useState<Filtro>(() => lerFiltro(parametros.get("situacao")));
  const [busca, setBusca] = useState(() => parametros.get("busca") ?? "");
  const [ordem, setOrdem] = useState(() => (ordenacoes.some((opcao) => opcao.valor === parametros.get("ordem")) ? (parametros.get("ordem") as string) : ordenacoes[0].valor));
  const [quantos, setQuantos] = useState(POR_PAGINA);
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set());
  const [lote, setLote] = useState<AcaoEmLote | null>(null);
  const primeiraNovaRef = useRef<string | null>(null);

  // Endereço: só o que difere do padrão.
  useEffect(() => {
    const novos = new URLSearchParams(window.location.search);
    const definir = (nome: string, valor: string, padrao: string) => (valor && valor !== padrao ? novos.set(nome, valor) : novos.delete(nome));
    definir("situacao", filtro, "todos");
    definir("busca", busca.trim(), "");
    definir("ordem", ordem, ordenacoes[0].valor);
    const consulta = novos.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${consulta ? `?${consulta}` : ""}`);
  }, [filtro, busca, ordem, ordenacoes]);

  // Seleção só do que ainda existe (depois de uma ação, a lista muda).
  const idsExistentes = useMemo(() => new Set(itens.map((item) => item.id)), [itens]);
  const selecaoValida = useMemo(() => new Set([...selecionados].filter((item) => idsExistentes.has(item))), [selecionados, idsExistentes]);

  const termo = normalizar(busca);
  const comBusca = useMemo(() => (termo ? itens.filter((item) => normalizar(`${item.nome} ${item.busca ?? ""}`).includes(termo)) : itens), [itens, termo]);
  const contagens = useMemo(
    () => ({
      todos: comBusca.filter((item) => item.situacao !== "lixeira").length,
      publicado: comBusca.filter((item) => item.situacao === "publicado").length,
      rascunho: comBusca.filter((item) => item.situacao === "rascunho").length,
      lixeira: comBusca.filter((item) => item.situacao === "lixeira").length,
    }),
    [comBusca],
  );
  const ordenacao = ordenacoes.find((opcao) => opcao.valor === ordem) ?? ordenacoes[0];
  const filtrados = useMemo(() => {
    const daSituacao = comBusca.filter((item) => (filtro === "todos" ? item.situacao !== "lixeira" : item.situacao === filtro));
    const fator = ordenacao.direcao === "asc" ? 1 : -1;
    return [...daSituacao].sort((a, b) => {
      const x = a.chaves[ordenacao.chave] ?? "";
      const y = b.chaves[ordenacao.chave] ?? "";
      const comparacao = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "pt-BR");
      return comparacao * fator || a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [comBusca, filtro, ordenacao]);
  const mostrados = filtrados.slice(0, quantos);
  const restam = filtrados.length - mostrados.length;
  const selecionadosMostrados = mostrados.filter((item) => selecaoValida.has(item.id));
  const todosMarcados = mostrados.length > 0 && selecionadosMostrados.length === mostrados.length;

  // Ao mostrar mais, o foco vai para a primeira linha nova.
  useEffect(() => {
    if (!primeiraNovaRef.current) return;
    document.getElementById(`${id}-selecionar-${primeiraNovaRef.current}`)?.focus();
    primeiraNovaRef.current = null;
  }, [quantos, id]);

  function trocarFiltro(novo: Filtro) {
    setFiltro(novo);
    setQuantos(POR_PAGINA);
    setSelecionados(new Set());
  }

  function alternar(idDoItem: string) {
    setSelecionados((atuais) => {
      const novos = new Set([...atuais].filter((item) => idsExistentes.has(item)));
      if (novos.has(idDoItem)) novos.delete(idDoItem);
      else novos.add(idDoItem);
      return novos;
    });
  }

  function alternarTodos() {
    setSelecionados(todosMarcados ? new Set() : new Set(mostrados.map((item) => item.id)));
  }

  function mostrarMais() {
    primeiraNovaRef.current = filtrados[quantos]?.id ?? null;
    setQuantos((atual) => atual + POR_PAGINA);
  }

  const nomeDaQuantidade = (quantidade: number) => `${quantidade} ${quantidade === 1 ? rotulos.singular : rotulos.plural}`;
  const FILTROS: { valor: Filtro; rotulo: string }[] = [
    { valor: "todos", rotulo: "Todos" },
    { valor: "publicado", rotulo: rotulos.publicados },
    { valor: "rascunho", rotulo: rotulos.rascunhos },
    { valor: "lixeira", rotulo: "Lixeira" },
  ];
  const acoesDoLote: { acao: AcaoEmLote; rotulo: string }[] =
    filtro === "lixeira"
      ? [{ acao: "restaurar", rotulo: "Restaurar" }]
      : [...(comSituacao ? [{ acao: "despublicar" as const, rotulo: rotulos.publicados === "Ativos" ? "Desativar" : "Despublicar" }] : []), { acao: "lixeira" as const, rotulo: "Mover para a lixeira" }];
  const rotuloDoLote = acoesDoLote.find((item) => item.acao === lote)?.rotulo ?? "";

  if (itens.length === 0) return <TabelaPainel legenda="" colunas={[]} vazia estadoVazio={estadoVazio}>{null}</TabelaPainel>;

  const vazioDoFiltro =
    filtro === "lixeira" && !termo
      ? "A lixeira está vazia."
      : termo
        ? `Nenhum resultado para "${busca.trim()}" em ${FILTROS.find((item) => item.valor === filtro)?.rotulo.toLowerCase()}.`
        : `Nenhum item em ${FILTROS.find((item) => item.valor === filtro)?.rotulo.toLowerCase()}.`;

  return (
    <div className={estilos.lista}>
      <div className={estilos.barra} role="search">
        <div className={estilos.campo}>
          <label htmlFor={`${id}-busca`} className={estilos.rotulo}>{rotuloDaBusca}</label>
          <input
            id={`${id}-busca`}
            type="search"
            className={estilos.entrada}
            value={busca}
            autoComplete="off"
            onChange={(evento) => {
              setBusca(evento.target.value);
              setQuantos(POR_PAGINA);
              setSelecionados(new Set());
            }}
          />
        </div>
        <div className={estilos.campo}>
          <label htmlFor={`${id}-ordem`} className={estilos.rotulo}>Ordenar por</label>
          <select id={`${id}-ordem`} className={estilos.entrada} value={ordem} onChange={(evento) => setOrdem(evento.target.value)}>
            {ordenacoes.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>
            ))}
          </select>
        </div>
        <div className={estilos.filtros} role="group" aria-label="Situação">
          {FILTROS.map((item) => (
            <button key={item.valor} type="button" className={estilos.filtro} aria-pressed={filtro === item.valor} onClick={() => trocarFiltro(item.valor)}>
              {item.rotulo} <span className={estilos.contagem}>({contagens[item.valor]})</span>
            </button>
          ))}
        </div>
        <p className={estilos.situacaoDaLista} aria-live="polite">
          {filtrados.length === 0 ? vazioDoFiltro : `Mostrando ${mostrados.length} de ${nomeDaQuantidade(filtrados.length)}.`}
          {termo && filtro !== "lixeira" && contagens.lixeira > 0 && ` Também há ${contagens.lixeira} na lixeira.`}
        </p>
        {termo && filtro !== "lixeira" && contagens.lixeira > 0 && (
          <Botao type="button" variante="link" onClick={() => trocarFiltro("lixeira")}>
            Ver os resultados da lixeira
          </Botao>
        )}
      </div>

      {filtrados.length > 0 && (
        <div className={estilos.barraDoLote}>
          <label className={estilos.marcarTodos}>
            <input type="checkbox" checked={todosMarcados} ref={(caixa) => { if (caixa) caixa.indeterminate = selecionadosMostrados.length > 0 && !todosMarcados; }} onChange={alternarTodos} />
            Selecionar os {mostrados.length} mostrados
          </label>
          <p className={estilos.selecionados} aria-live="polite">
            {selecaoValida.size === 0 ? "Nenhum selecionado." : `${nomeDaQuantidade(selecaoValida.size)} ${selecaoValida.size === 1 ? "selecionado" : "selecionados"}.`}
          </p>
          {selecaoValida.size > 0 && (
            <div className={estilos.botoesDoLote}>
              {acoesDoLote.map((item) => (
                <Botao key={item.acao} type="button" variante="secundario" onClick={() => setLote(item.acao)}>
                  {item.rotulo}
                </Botao>
              ))}
              <Botao type="button" variante="link" onClick={() => setSelecionados(new Set())}>
                Limpar seleção
              </Botao>
            </div>
          )}
        </div>
      )}

      {filtrados.length > 0 && (
        <TabelaPainel legenda={`Ordem: ${ordenacao.rotulo.toLowerCase()}.`} colunas={["Selecionar", ...colunas, "Ações"]} vazia={false} estadoVazio={null}>
          {mostrados.map((item) => (
            <tr key={item.id}>
              <CelulaDoPainel rotulo="Selecionar">
                {/* O rótulo em volta dá à caixa a área de toque de 44 px. */}
                <label className={estilos.alvoDaCaixa}>
                  <input
                    id={`${id}-selecionar-${item.id}`}
                    type="checkbox"
                    className={estilos.caixa}
                    checked={selecaoValida.has(item.id)}
                    onChange={() => alternar(item.id)}
                    aria-label={`Selecionar "${item.nome}"`}
                  />
                </label>
              </CelulaDoPainel>
              {item.celulas.map((celula, indice) => (
                <CelulaDoPainel key={colunas[indice]} rotulo={colunas[indice]} destaque={indice === 0}>
                  {celula}
                </CelulaDoPainel>
              ))}
              <CelulaDoPainel rotulo="Ações" acoes>
                {item.acoes}
              </CelulaDoPainel>
            </tr>
          ))}
        </TabelaPainel>
      )}

      {restam > 0 && (
        <div className={estilos.mais}>
          <Botao type="button" variante="secundario" onClick={mostrarMais}>
            Mostrar mais {Math.min(restam, POR_PAGINA)} (faltam {restam})
          </Botao>
        </div>
      )}

      <ConfirmacaoDoPainel
        aberto={lote !== null}
        aoFechar={() => setLote(null)}
        titulo={`${rotuloDoLote}: ${nomeDaQuantidade(selecaoValida.size)}`}
        rotuloDoBotao={rotuloDoLote}
        aoConfirmar={async () => {
          if (!lote) return { ok: false, mensagem: "Nada selecionado." };
          const resposta = await aplicarAcaoEmLote(colecao, [...selecaoValida], lote);
          if (resposta.ok || (resposta.avisos?.length ?? 0) > 0) {
            avisar({ tipo: resposta.ok ? "sucesso" : "erro", texto: resposta.mensagem, avisos: resposta.avisos, focar: true });
            setSelecionados(new Set());
            router.refresh();
            return { ok: true, mensagem: resposta.mensagem };
          }
          return resposta;
        }}
      >
        <p>
          {lote === "lixeira" && `Os itens selecionados saem do site e ficam na lixeira, de onde podem ser restaurados.`}
          {lote === "despublicar" && `Os itens selecionados saem do site e continuam no painel.`}
          {lote === "restaurar" && `Os itens selecionados saem da lixeira.`}
        </p>
        <ul className={estilos.nomesDoLote}>
          {itens
            .filter((item) => selecaoValida.has(item.id))
            .slice(0, 8)
            .map((item) => (
              <li key={item.id}>{item.nome}</li>
            ))}
          {selecaoValida.size > 8 && <li>e mais {selecaoValida.size - 8}</li>}
        </ul>
      </ConfirmacaoDoPainel>
    </div>
  );
}
