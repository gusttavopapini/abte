"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FocusEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
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

type Props = {
  colecao: ColecaoDoPainel;
  id: string;
  nome: string;
  situacao: Situacao;
  hrefEditar: string;
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
export function AcoesDoItem({ colecao, id, nome, situacao, hrefEditar, hrefNoSite, podeExcluirDeVez, podeDuplicar, prefixoDaCopia, perdas }: Props) {
  const router = useRouter();
  const avisar = useAvisarNoPainel();
  const idDaLista = useId();
  const [aberto, setAberto] = useState(false);
  const [janela, setJanela] = useState<Janela>(null);
  const [ocupado, setOcupado] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const configuracao = COLECOES_DO_PAINEL[colecao];
  const naLixeira = situacao === "lixeira";
  const rotuloLigar = configuracao.situacao?.ligado === "publicado" ? "Publicar" : "Ativar";
  const rotuloDesligar = configuracao.situacao?.ligado === "publicado" ? "Despublicar" : "Desativar";

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

  // A janela de confirmação devolve o foco a quem a abriu: o botão "Ações".
  function abrirJanela(tipo: Exclude<Janela, null>) {
    setAberto(false);
    botaoRef.current?.focus();
    setJanela(tipo);
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
            <li>
              <Link href={hrefEditar} className={estilos.item}>Editar</Link>
            </li>
            {hrefNoSite && situacao === "publicado" && (
              <li>
                <a href={hrefNoSite} target="_blank" rel="noopener noreferrer" className={estilos.item}>
                  Ver no site<span className="somente-leitor"> (abre em nova aba)</span>
                </a>
              </li>
            )}
            {configuracao.situacao && (
              <li>
                <button type="button" className={estilos.item} onClick={() => executar(() => publicarOuDespublicar(colecao, id, situacao !== "publicado"), false)}>
                  {situacao === "publicado" ? rotuloDesligar : rotuloLigar}
                </button>
              </li>
            )}
            {podeDuplicar && (
              <li>
                <button type="button" className={estilos.item} onClick={() => executar(() => duplicarItem(colecao, id), true)}>Duplicar</button>
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
              <button type="button" className={estilos.item} onClick={() => executar(() => restaurarItemDaLixeira(colecao, id), true)}>Restaurar</button>
            </li>
            <li>
              <Link href={hrefEditar} className={estilos.item}>Abrir</Link>
            </li>
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
          const resposta = await moverItemParaALixeira(colecao, id);
          if (resposta.ok) concluir(resposta, true);
          return resposta;
        }}
      >
        <p>
          {configuracao.artigo === "a" ? "A" : "O"} {configuracao.nome} sai do site e fica na lixeira, de onde pode ser {configuracao.artigo === "a" ? "restaurada" : "restaurado"} depois.
          {configuracao.rascunhoNaLixeira && " Se for restaurado, volta como rascunho."}
        </p>
      </ConfirmacaoDoPainel>

      <ConfirmacaoDoPainel
        aberto={janela === "excluirDeVez"}
        aoFechar={() => setJanela(null)}
        titulo={`Excluir de vez: "${nome}"`}
        rotuloDoBotao="Excluir de vez"
        reforcada={{ nome, perdas }}
        aoConfirmar={async (confirmacao) => {
          const resposta = await excluirItemDeVez(colecao, id, confirmacao);
          if (resposta.ok) concluir(resposta, true);
          return resposta;
        }}
      >
        <p>{configuracao.artigo === "a" ? "A" : "O"} {configuracao.nome} será {configuracao.artigo === "a" ? "apagada" : "apagado"} do painel e não poderá ser {configuracao.artigo === "a" ? "recuperada" : "recuperado"}.</p>
      </ConfirmacaoDoPainel>
    </div>
  );
}
