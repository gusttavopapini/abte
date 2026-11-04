"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FocusEvent, type KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  duplicarItem,
  excluirItemDeVez,
  moverItemParaALixeira,
  publicarOuDespublicar,
  restaurarItemDaLixeira,
  type RespostaDaAcaoDoItem,
} from "@/app/admin/acoes-lixeira";
import { COLECOES_DO_PAINEL, type ColecaoDoPainel, type Situacao } from "@/lib/lixeira";
import { ConfirmacaoDoPainel } from "../ConfirmacaoDoPainel/ConfirmacaoDoPainel";
import { useAvisarNoPainel } from "../MensagensDoPainel/MensagensDoPainel";
import estilos from "./AcoesDoItem.module.css";

// Operações do menu. Para as coleções, montadas a partir das ações comuns
// (acoes-lixeira.ts); itens fora de coleção (banners da home) passam as suas.
export type OperacoesDoItem = {
  mudarSituacao?: (ligar: boolean) => Promise<RespostaDaAcaoDoItem>;
  duplicar?: () => Promise<RespostaDaAcaoDoItem>;
  moverParaLixeira: () => Promise<RespostaDaAcaoDoItem>;
  restaurar: () => Promise<RespostaDaAcaoDoItem>;
  excluirDeVez: (confirmacao: string) => Promise<RespostaDaAcaoDoItem>;
};

// Como o item é chamado nas mensagens e nos botões.
export type TextosDoItem = {
  artigo: "o" | "a";
  nome: string;
  // Rótulos de publicar e despublicar (ou ativar e desativar); null: sem.
  ligar: string | null;
  desligar: string | null;
  // Posts e artigos voltam da lixeira como rascunho.
  voltaComoRascunho: boolean;
};

function textosDaColecao(colecao: ColecaoDoPainel): TextosDoItem {
  const { artigo, nome, situacao, rascunhoNaLixeira } = COLECOES_DO_PAINEL[colecao];
  const publicacao = situacao?.ligado === "publicado";
  return {
    artigo,
    nome,
    ligar: situacao ? (publicacao ? "Publicar" : "Ativar") : null,
    desligar: situacao ? (publicacao ? "Despublicar" : "Desativar") : null,
    voltaComoRascunho: rascunhoNaLixeira,
  };
}

function operacoesDaColecao(colecao: ColecaoDoPainel, id: string, podeDuplicar: boolean): OperacoesDoItem {
  return {
    mudarSituacao: COLECOES_DO_PAINEL[colecao].situacao ? (ligar) => publicarOuDespublicar(colecao, id, ligar) : undefined,
    duplicar: podeDuplicar ? () => duplicarItem(colecao, id) : undefined,
    moverParaLixeira: () => moverItemParaALixeira(colecao, id),
    restaurar: () => restaurarItemDaLixeira(colecao, id),
    excluirDeVez: (confirmacao) => excluirItemDeVez(colecao, id, confirmacao),
  };
}

type Props = {
  // Item de uma coleção: as operações e os textos vêm dela.
  colecao?: ColecaoDoPainel;
  // Item fora de coleção (banner da home): operações e textos próprios.
  operacoes?: OperacoesDoItem;
  textos?: TextosDoItem;
  id: string;
  nome: string;
  situacao: Situacao;
  // Editar por endereço (página do formulário) ou por janela na própria tela.
  hrefEditar?: string;
  aoEditar?: () => void;
  // "Abrir" na lixeira (ver o item sem restaurar); falso esconde.
  abrirNaLixeira?: boolean;
  // Endereço no site, só quando publicado.
  hrefNoSite?: string | null;
  podeExcluirDeVez: boolean;
  podeDuplicar?: boolean;
  // Começo do endereço de edição da cópia (o id novo vai no fim).
  prefixoDaCopia?: string;
  // O que será perdido ao excluir de vez (texto da confirmação reforçada).
  perdas: string[];
};

type Janela = "lixeira" | "excluirDeVez" | null;

const FOCAVEIS = "a[href], button:not([disabled])";

// Menu de ações de uma linha das listas do painel (04/11/2026): botão
// "Ações" que abre a lista (aria-expanded), operável por teclado (setas, Esc
// fecha e devolve o foco, Tab para fora fecha). Mover para a lixeira e
// excluir de vez pedem confirmação na janela do painel; o resultado aparece
// na caixa de mensagens acima da lista.
export function AcoesDoItem({ colecao, operacoes, textos, id, nome, situacao, hrefEditar, aoEditar, abrirNaLixeira = true, hrefNoSite, podeExcluirDeVez, podeDuplicar = false, prefixoDaCopia, perdas }: Props) {
  const router = useRouter();
  const avisar = useAvisarNoPainel();
  const idDaLista = useId();
  const [aberto, setAberto] = useState(false);
  const [janela, setJanela] = useState<Janela>(null);
  const [ocupado, setOcupado] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  if (!colecao && (!operacoes || !textos)) throw new Error("AcoesDoItem precisa de uma coleção ou de operações e textos.");
  const ops = operacoes ?? operacoesDaColecao(colecao as ColecaoDoPainel, id, podeDuplicar);
  const t = textos ?? textosDaColecao(colecao as ColecaoDoPainel);
  const naLixeira = situacao === "lixeira";
  const restaurado = t.artigo === "a" ? "restaurada" : "restaurado";

  // A lista abre alinhada à direita do botão (fim da linha da tabela); se
  // assim sair da tela (botão perto da borda esquerda, como nos cartões dos
  // banners), abre para a direita. Atributo posto direto no elemento, antes
  // da pintura, sem nova renderização.
  useLayoutEffect(() => {
    const lista = listaRef.current;
    if (!lista || !aberto) return;
    delete lista.dataset.abrir;
    if (lista.getBoundingClientRect().left < 0) lista.dataset.abrir = "direita";
  }, [aberto]);

  // Clique fora fecha o menu.
  useEffect(() => {
    if (!aberto) return;
    function aoApertar(evento: PointerEvent) {
      if (caixaRef.current && !caixaRef.current.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener("pointerdown", aoApertar);
    return () => document.removeEventListener("pointerdown", aoApertar);
  }, [aberto]);

  function itens(): HTMLElement[] {
    return Array.from(listaRef.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? []);
  }

  function abrir(focarPrimeiro: boolean) {
    setAberto(true);
    if (focarPrimeiro) requestAnimationFrame(() => itens()[0]?.focus());
  }

  function fecharEVoltar() {
    setAberto(false);
    botaoRef.current?.focus();
  }

  function aoTeclarNoBotao(evento: KeyboardEvent<HTMLButtonElement>) {
    if (evento.key === "ArrowDown" && !ocupado) {
      evento.preventDefault();
      abrir(true);
    }
  }

  function aoTeclarNaLista(evento: KeyboardEvent<HTMLUListElement>) {
    const lista = itens();
    const indice = lista.indexOf(document.activeElement as HTMLElement);
    if (evento.key === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      fecharEVoltar();
    } else if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      const passo = evento.key === "ArrowDown" ? 1 : -1;
      lista[(indice + passo + lista.length) % lista.length]?.focus();
    } else if (evento.key === "Home" || evento.key === "End") {
      evento.preventDefault();
      (evento.key === "Home" ? lista[0] : lista[lista.length - 1])?.focus();
    }
  }

  // Tab para fora do menu fecha.
  function aoSairDoFoco(evento: FocusEvent<HTMLDivElement>) {
    if (!caixaRef.current?.contains(evento.relatedTarget as Node | null)) setAberto(false);
  }

  // A janela de confirmação (e a de edição) devolve o foco a quem a abriu:
  // o botão "Ações".
  function abrirJanela(tipo: Exclude<Janela, null>) {
    setAberto(false);
    botaoRef.current?.focus();
    setJanela(tipo);
  }

  function editar() {
    setAberto(false);
    botaoRef.current?.focus();
    aoEditar?.();
  }

  function concluir(resposta: RespostaDaAcaoDoItem, focar: boolean, link?: { href: string; rotulo: string }) {
    avisar({ tipo: resposta.ok ? "sucesso" : "erro", texto: resposta.mensagem, avisos: resposta.avisos, link, focar: focar || !resposta.ok });
    if (resposta.ok) router.refresh();
  }

  // Ações sem confirmação: publicar, despublicar, restaurar e duplicar.
  async function executar(acao: () => Promise<RespostaDaAcaoDoItem>, focarMensagem: boolean) {
    setAberto(false);
    botaoRef.current?.focus();
    setOcupado(true);
    try {
      const resposta = await acao();
      const link = resposta.ok && resposta.novoId && prefixoDaCopia ? { href: `${prefixoDaCopia}${resposta.novoId}`, rotulo: "Editar a cópia" } : undefined;
      concluir(resposta, focarMensagem, link);
    } catch {
      avisar({ tipo: "erro", texto: "Não foi possível concluir agora. Tente de novo em instantes.", focar: true });
    } finally {
      setOcupado(false);
    }
  }

  const itemDeEditar = (rotulo: string) =>
    aoEditar ? (
      <li>
        <button type="button" className={estilos.item} onClick={editar}>{rotulo}</button>
      </li>
    ) : hrefEditar ? (
      <li>
        <Link href={hrefEditar} className={estilos.item}>{rotulo}</Link>
      </li>
    ) : null;
  const { mudarSituacao, duplicar } = ops;

  return (
    <div ref={caixaRef} className={estilos.caixa} onBlur={aoSairDoFoco}>
      <button
        ref={botaoRef}
        type="button"
        className={estilos.botao}
        aria-expanded={aberto}
        aria-controls={idDaLista}
        // Ocupado: continua focável (desligar o botão tiraria o foco dele),
        // só ignora o clique até a ação terminar.
        aria-busy={ocupado}
        onClick={() => {
          if (ocupado) return;
          if (aberto) setAberto(false);
          else abrir(false);
        }}
        onKeyDown={aoTeclarNoBotao}
      >
        {ocupado ? "Aguarde..." : "Ações"}
        <span className="somente-leitor"> para &quot;{nome}&quot;</span>
        <svg className={`${estilos.seta} ${aberto ? estilos.setaAberta : ""}`} viewBox="0 0 12 8" aria-hidden="true" focusable="false">
          <path d="M1 1.5 6 6.5l5-5" />
        </svg>
      </button>
      <ul id={idDaLista} ref={listaRef} className={estilos.lista} hidden={!aberto} onKeyDown={aoTeclarNaLista}>
        {!naLixeira && (
          <>
            {itemDeEditar("Editar")}
            {hrefNoSite && situacao === "publicado" && (
              <li>
                <a href={hrefNoSite} target="_blank" rel="noopener noreferrer" className={estilos.item}>
                  Ver no site<span className="somente-leitor"> (abre em nova aba)</span>
                </a>
              </li>
            )}
            {mudarSituacao && t.ligar && t.desligar && (
              <li>
                <button type="button" className={estilos.item} onClick={() => executar(() => mudarSituacao(situacao !== "publicado"), false)}>
                  {situacao === "publicado" ? t.desligar : t.ligar}
                </button>
              </li>
            )}
            {duplicar && (
              <li>
                <button type="button" className={estilos.item} onClick={() => executar(duplicar, true)}>Duplicar</button>
              </li>
            )}
            <li>
              <button type="button" className={estilos.item} onClick={() => abrirJanela("lixeira")}>Mover para a lixeira</button>
            </li>
          </>
        )}
        {naLixeira && (
          <>
            <li>
              <button type="button" className={estilos.item} onClick={() => executar(ops.restaurar, true)}>Restaurar</button>
            </li>
            {abrirNaLixeira && itemDeEditar("Abrir")}
            {podeExcluirDeVez && (
              <li>
                <button type="button" className={estilos.item} onClick={() => abrirJanela("excluirDeVez")}>Excluir de vez</button>
              </li>
            )}
          </>
        )}
      </ul>

      <ConfirmacaoDoPainel
        aberto={janela === "lixeira"}
        aoFechar={() => setJanela(null)}
        titulo={`Mover para a lixeira: "${nome}"`}
        rotuloDoBotao="Mover para a lixeira"
        aoConfirmar={async () => {
          const resposta = await ops.moverParaLixeira();
          if (resposta.ok) concluir(resposta, true);
          return resposta;
        }}
      >
        <p>
          {t.artigo === "a" ? "A" : "O"} {t.nome} sai do site e fica na lixeira, de onde pode ser {restaurado} depois.
          {t.voltaComoRascunho && ` Se for ${restaurado}, volta como rascunho.`}
        </p>
      </ConfirmacaoDoPainel>

      <ConfirmacaoDoPainel
        aberto={janela === "excluirDeVez"}
        aoFechar={() => setJanela(null)}
        titulo={`Excluir de vez: "${nome}"`}
        rotuloDoBotao="Excluir de vez"
        reforcada={{ nome, perdas }}
        aoConfirmar={async (confirmacao) => {
          const resposta = await ops.excluirDeVez(confirmacao);
          if (resposta.ok) concluir(resposta, true);
          return resposta;
        }}
      >
        <p>
          {t.artigo === "a" ? "A" : "O"} {t.nome} será {t.artigo === "a" ? "apagada" : "apagado"} do painel e não poderá ser {t.artigo === "a" ? "recuperada" : "recuperado"}.
        </p>
      </ConfirmacaoDoPainel>
    </div>
  );
}
