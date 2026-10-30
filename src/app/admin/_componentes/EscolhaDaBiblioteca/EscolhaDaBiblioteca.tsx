"use client";

import { useEffect, useId, useImperativeHandle, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { EnviarMidia } from "@/app/admin/_componentes/EnviarMidia/EnviarMidia";
import { listarMidiasDoSeletor } from "@/app/admin/acoes-midia";
import { Botao } from "@/components/Botao/Botao";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import type { MidiaNaTela } from "@/lib/midia/tela";
import estilos from "./EscolhaDaBiblioteca.module.css";

// O que quem usa pode pedir: levar o foco ao botão da biblioteca.
export type ControleDaEscolha = { focar: () => void };

type Props = {
  rotuloDaBiblioteca: string;
  // Imagens já escolhidas: aparecem marcadas na biblioteca.
  jaEscolhidas: string[];
  // Na galeria, uma imagem já escolhida não pode entrar de novo.
  bloquearEscolhidas?: boolean;
  // Sem os botões (ex.: galeria no limite de imagens).
  desativado?: boolean;
  // Imagem escolhida ou enviada (midia null: enviada, mas fora da lista).
  aoEscolher: (id: string, midia: MidiaNaTela | null) => void;
  // Botões a mais na mesma linha (ex.: "Remover imagem").
  extra?: ReactNode;
  controle?: Ref<ControleDaEscolha>;
  // Campo de imagem de um item (ImagemDoItem e galeria, 29/10/2026): o envio
  // fica no próprio campo, então aqui só a biblioteca, aberta por um link
  // secundário ("Reutilizar imagem já enviada").
  soBiblioteca?: boolean;
};

type Painel = "biblioteca" | "enviar" | null;

// Busca sem diferença de maiúsculas e acentos.
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Escolher uma imagem da biblioteca (busca pelo texto alternativo, miniaturas
// operáveis por teclado) ou enviar uma nova sem sair do formulário. Usada pelo
// seletor de mídia (uma imagem) e pela galeria de mídia (várias).
export function EscolhaDaBiblioteca({ rotuloDaBiblioteca, jaEscolhidas, bloquearEscolhidas, desativado, aoEscolher, extra, controle, soBiblioteca }: Props) {
  const id = useId();
  const [painel, setPainel] = useState<Painel>(null);
  const [midias, setMidias] = useState<MidiaNaTela[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroDaLista, setErroDaLista] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const botaoBibliotecaRef = useRef<HTMLButtonElement>(null);
  const buscaRef = useRef<HTMLInputElement>(null);
  // Para onde o foco vai depois da próxima renderização (busca ao abrir a
  // biblioteca, botão ao fechar), já com o painel na tela.
  const focoPendente = useRef<"busca" | "botao" | null>(null);

  useImperativeHandle(controle, () => ({ focar: () => botaoBibliotecaRef.current?.focus() }), []);

  useEffect(() => {
    const alvo = focoPendente.current;
    if (!alvo) return;
    focoPendente.current = null;
    (alvo === "busca" ? buscaRef : botaoBibliotecaRef).current?.focus();
  });

  async function carregar(): Promise<MidiaNaTela[]> {
    setCarregando(true);
    setErroDaLista(null);
    try {
      const resposta = await listarMidiasDoSeletor();
      if (!resposta.ok) setErroDaLista(resposta.mensagem);
      setMidias(resposta.midias);
      return resposta.midias;
    } catch {
      setErroDaLista("Não foi possível abrir a biblioteca agora. Confira a conexão e tente de novo.");
      return [];
    } finally {
      setCarregando(false);
    }
  }

  function abrirBiblioteca() {
    if (painel === "biblioteca") return fecharPainel();
    setPainel("biblioteca");
    setBusca("");
    focoPendente.current = "busca";
    void carregar();
  }

  function fecharPainel() {
    setPainel(null);
    focoPendente.current = "botao";
  }

  function escolher(midia: MidiaNaTela) {
    aoEscolher(midia.id, midia);
    fecharPainel();
  }

  // Imagem nova: entra na biblioteca e já fica escolhida.
  async function aoEnviar(_mensagem: string, novoId: string) {
    const lista = await carregar();
    aoEscolher(novoId, lista.find((midia) => midia.id === novoId) ?? null);
    fecharPainel();
  }

  // Enter na busca não envia o formulário de fora.
  function aoTeclarNaBusca(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Enter") evento.preventDefault();
  }

  const termo = normalizar(busca.trim());
  const visiveis = (midias ?? []).filter((midia) => !termo || normalizar(midia.alt).includes(termo));
  const idPainel = `${id}-painel`;

  return (
    <>
      <div className={estilos.botoes}>
        {!desativado && (
          <>
            <Botao
              ref={botaoBibliotecaRef}
              type="button"
              variante={soBiblioteca ? "link" : "secundario"}
              onClick={abrirBiblioteca}
              aria-expanded={painel === "biblioteca"}
              aria-controls={painel === "biblioteca" ? idPainel : undefined}
            >
              {rotuloDaBiblioteca}
            </Botao>
            {!soBiblioteca && (
              <Botao
                type="button"
                variante="secundario"
                onClick={() => setPainel(painel === "enviar" ? null : "enviar")}
                aria-expanded={painel === "enviar"}
                aria-controls={painel === "enviar" ? idPainel : undefined}
              >
                Enviar nova imagem
              </Botao>
            )}
          </>
        )}
        {extra}
      </div>

      {painel === "biblioteca" && !desativado && (
        <div id={idPainel} className={estilos.painel} role="group" aria-label="Biblioteca de mídia">
          <div className={estilos.busca}>
            <label htmlFor={`${id}-busca`} className={estilos.rotulo}>Buscar pelo texto alternativo</label>
            <input
              ref={buscaRef}
              id={`${id}-busca`}
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              onKeyDown={aoTeclarNaBusca}
              className={estilos.campoBusca}
              autoComplete="off"
            />
          </div>
          {erroDaLista && <Mensagem tipo="erro">{erroDaLista}</Mensagem>}
          <p className={estilos.texto} aria-live="polite">
            {carregando ? "Carregando a biblioteca..." : midias && `${visiveis.length} ${visiveis.length === 1 ? "imagem" : "imagens"}`}
          </p>
          {!carregando && midias && visiveis.length === 0 && (
            <p className={estilos.texto}>{midias.length === 0 ? (soBiblioteca ? "A biblioteca ainda não tem imagens. Envie uma imagem pelo campo acima." : "A biblioteca ainda não tem imagens. Use \"Enviar nova imagem\".") : "Nenhuma imagem encontrada."}</p>
          )}
          {visiveis.length > 0 && (
            <ul role="list" className={estilos.grade}>
              {visiveis.map((midia) => {
                const escolhida = jaEscolhidas.includes(midia.id);
                return (
                  <li key={midia.id}>
                    <button
                      type="button"
                      className={estilos.opcao}
                      onClick={() => escolher(midia)}
                      aria-pressed={escolhida}
                      disabled={bloquearEscolhidas && escolhida}
                    >
                      <span className={estilos.miniatura}>
                        <ImagemDaMidia variantes={midia.variantes} alt="" largura={midia.largura} altura={midia.altura} sizes="160px" className={estilos.imagemDaMiniatura} />
                      </span>
                      <span className={estilos.altDaOpcao}>
                        {midia.alt}
                        {bloquearEscolhidas && escolhida && " (já está na galeria)"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className={estilos.botoes}>
            <Botao type="button" variante="secundario" onClick={fecharPainel}>Fechar biblioteca</Botao>
          </div>
        </div>
      )}

      {painel === "enviar" && !desativado && (
        <div id={idPainel} className={estilos.painel}>
          <EnviarMidia rotulo="Enviar nova imagem" aoEnviar={aoEnviar} aoCancelar={fecharPainel} />
        </div>
      )}
    </>
  );
}
