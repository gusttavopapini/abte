"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { EnviarMidia } from "@/app/admin/_componentes/EnviarMidia/EnviarMidia";
import { listarMidiasDoSeletor } from "@/app/admin/acoes-midia";
import { Botao } from "@/components/Botao/Botao";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import type { ImagemNaTela, MidiaNaTela } from "@/lib/midia/tela";
import estilos from "./SeletorDeMidia.module.css";

// Escolha atual: o id gravado e a imagem, ou imagem null quando ela foi para a
// lixeira da biblioteca ou foi excluída (o site mostra o espaço de imagem).
export type EscolhaDeMidia = { id: string; imagem: ImagemNaTela | null } | null;

type Props = {
  // Nome do campo escondido que vai no formulário (ex.: "fotoMidiaId").
  nome: string;
  rotulo: string;
  inicial: EscolhaDeMidia;
  erro?: string;
};

type Painel = "biblioteca" | "enviar" | null;

// Busca sem diferença de maiúsculas e acentos.
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Campo de imagem dos formulários do painel: escolher uma imagem da biblioteca,
// ver a prévia, remover a escolha ou enviar uma imagem nova sem sair do
// formulário. O texto alternativo vem da biblioteca e só é mostrado aqui (a
// edição fica em /admin/midia). O formulário recebe só o id, num campo
// escondido; a gravação confere no servidor se a imagem existe.
export function SeletorDeMidia({ nome, rotulo, inicial, erro }: Props) {
  const id = useId();
  const [escolha, setEscolha] = useState<EscolhaDeMidia>(inicial);
  const [painel, setPainel] = useState<Painel>(null);
  const [midias, setMidias] = useState<MidiaNaTela[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erroDaLista, setErroDaLista] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [anuncio, setAnuncio] = useState("");
  const botaoBibliotecaRef = useRef<HTMLButtonElement>(null);
  const buscaRef = useRef<HTMLInputElement>(null);
  // Para onde o foco vai depois da próxima renderização (busca ao abrir a
  // biblioteca, botão ao fechar), já com o painel na tela.
  const focoPendente = useRef<"busca" | "botao" | null>(null);

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
    setEscolha({ id: midia.id, imagem: midia });
    setAnuncio(`Imagem escolhida: ${midia.alt}`);
    fecharPainel();
  }

  function remover() {
    setEscolha(null);
    setAnuncio("Imagem removida. O site vai mostrar o espaço de imagem.");
    focoPendente.current = "botao";
  }

  // Imagem nova: entra na biblioteca e já fica escolhida.
  async function aoEnviar(_mensagem: string, novoId: string) {
    const lista = await carregar();
    const nova = lista.find((midia) => midia.id === novoId);
    setEscolha({ id: novoId, imagem: nova ?? null });
    setAnuncio(nova ? `Imagem enviada e escolhida: ${nova.alt}` : "Imagem enviada e escolhida.");
    fecharPainel();
  }

  // Enter na busca não envia o formulário de fora.
  function aoTeclarNaBusca(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Enter") evento.preventDefault();
  }

  const termo = normalizar(busca.trim());
  const visiveis = (midias ?? []).filter((midia) => !termo || normalizar(midia.alt).includes(termo));
  const idPainel = `${id}-painel`;
  const idErro = `${id}-erro`;

  return (
    <fieldset className={estilos.seletor} aria-describedby={erro ? idErro : undefined}>
      <legend className={estilos.rotulo}>{rotulo}</legend>
      <input type="hidden" name={nome} value={escolha?.id ?? ""} />

      <div className={estilos.escolha}>
        {escolha?.imagem ? (
          <>
            <div className={estilos.previa}>
              <ImagemDaMidia
                variantes={escolha.imagem.variantes}
                alt={escolha.imagem.alt}
                largura={escolha.imagem.largura}
                altura={escolha.imagem.altura}
                sizes="160px"
                className={estilos.imagemDaPrevia}
              />
            </div>
            <p className={`${estilos.texto} ${estilos.ladoDaPrevia}`}>
              <span className={estilos.legenda}>Texto alternativo (editável em Mídia):</span> {escolha.imagem.alt}
            </p>
          </>
        ) : (
          <p className={estilos.texto}>
            {escolha
              ? "A imagem escolhida foi para a lixeira da biblioteca ou foi excluída. O site mostra o espaço de imagem."
              : "Nenhuma imagem escolhida. O site mostra o espaço de imagem."}
          </p>
        )}
      </div>

      <div className={estilos.botoes}>
        <Botao
          ref={botaoBibliotecaRef}
          type="button"
          variante="secundario"
          onClick={abrirBiblioteca}
          aria-expanded={painel === "biblioteca"}
          aria-controls={painel === "biblioteca" ? idPainel : undefined}
        >
          {escolha ? "Trocar pela biblioteca" : "Escolher da biblioteca"}
        </Botao>
        <Botao
          type="button"
          variante="secundario"
          onClick={() => setPainel(painel === "enviar" ? null : "enviar")}
          aria-expanded={painel === "enviar"}
          aria-controls={painel === "enviar" ? idPainel : undefined}
        >
          Enviar nova imagem
        </Botao>
        {escolha && (
          <Botao type="button" variante="secundario" onClick={remover}>
            Remover imagem
          </Botao>
        )}
      </div>

      {painel === "biblioteca" && (
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
            <p className={estilos.texto}>{midias.length === 0 ? "A biblioteca ainda não tem imagens. Use \"Enviar nova imagem\"." : "Nenhuma imagem encontrada."}</p>
          )}
          {visiveis.length > 0 && (
            <ul role="list" className={estilos.grade}>
              {visiveis.map((midia) => (
                <li key={midia.id}>
                  <button
                    type="button"
                    className={estilos.opcao}
                    onClick={() => escolher(midia)}
                    aria-pressed={escolha?.id === midia.id}
                  >
                    <span className={estilos.miniatura}>
                      <ImagemDaMidia variantes={midia.variantes} alt="" largura={midia.largura} altura={midia.altura} sizes="160px" className={estilos.imagemDaMiniatura} />
                    </span>
                    <span className={estilos.altDaOpcao}>{midia.alt}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={estilos.botoes}>
            <Botao type="button" variante="secundario" onClick={fecharPainel}>Fechar biblioteca</Botao>
          </div>
        </div>
      )}

      {painel === "enviar" && (
        <div id={idPainel} className={estilos.painel}>
          <EnviarMidia rotulo="Enviar nova imagem" aoEnviar={aoEnviar} aoCancelar={fecharPainel} />
        </div>
      )}

      {erro && <p id={idErro} className={estilos.erro}>{erro}</p>}
      <p className="somente-leitor" aria-live="polite">{anuncio}</p>
    </fieldset>
  );
}
