"use client";

import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { EscolhaDaBiblioteca, type ControleDaEscolha } from "@/app/admin/_componentes/EscolhaDaBiblioteca/EscolhaDaBiblioteca";
import { TEXTO_AUTORIZACAO, TEXTO_INDICA_MENOR } from "@/app/admin/_componentes/EnviarMidia/EnviarMidia";
import { enviarArquivo, type EtapaDoEnvio } from "@/app/admin/_componentes/EnviarMidia/enviarArquivo";
import { Botao } from "@/components/Botao/Botao";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import type { DonoDaMidia } from "@/lib/midia/dono";
import { LIMITE_DO_ALT, MENSAGENS, validarAlt, validarAvisoDeMenor } from "@/lib/midia/regras";
import type { ImagemNaTela, MidiaNaTela } from "@/lib/midia/tela";
import estilos from "./ImagemDoItem.module.css";

// Escolha gravada: o id e a imagem, ou imagem null quando ela foi para a
// lixeira da biblioteca ou foi excluída (o site mostra o espaço de imagem).
export type EscolhaDeImagem = { id: string; imagem: ImagemNaTela | null } | null;

// Tipos aceitos antes da redução (o servidor confere de novo pela assinatura).
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

export const ORIENTACAO_DO_ALT = "Descreva o que a imagem mostra, como contaria a alguém que não pode vê-la (ex.: \"Capa da cartilha com duas meninas sorrindo\"). Não comece com \"Imagem de\".";

type Erros = { arquivo?: string; alt?: string; autorizacao?: string };

type Props = {
  // Nome do campo escondido que vai no formulário (ex.: "capaMidiaId").
  nome?: string;
  rotulo: string;
  inicial: EscolhaDeImagem;
  // A que item a imagem pertence (id null em item novo: completa ao salvar).
  dono: DonoDaMidia;
  // Proporção em que a imagem aparece no site (ex.: "16:9, como a capa no blog").
  proporcao: string;
  erro?: string;
  aoMudar?: (escolha: EscolhaDeImagem) => void;
  // Texto do botão de enviar (ex.: "Inserir no texto").
  textoDoEnvio?: string;
  // Sem prévia nem "Trocar" depois do envio (ex.: imagem no texto do post,
  // que só insere e volta ao estado vazio).
  soEnvio?: boolean;
};

function descreverTamanho(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Campo de imagem dos formulários do painel (29/10/2026): cada item envia a
// SUA imagem sem ir à biblioteca. Área de envio com botão e arrastar e
// soltar, prévia, texto alternativo obrigatório, aviso de menores (o mesmo
// do envio da biblioteca), progresso e erro em caixa branca, "Trocar" e
// "Remover". O envio passa pelo mesmo caminho da biblioteca (enviarArquivo:
// redução no navegador, processamento e WebP no servidor) e grava o dono da
// imagem. "Reutilizar imagem já enviada" abre a biblioteca.
// Não é um <form> e os campos não têm "name" (só o escondido com o id): fica
// dentro do formulário do item sem ir junto nem travar o envio dele.
export function ImagemDoItem({ nome, rotulo, inicial, dono, proporcao, erro, aoMudar, textoDoEnvio = "Enviar imagem", soEnvio }: Props) {
  const id = useId();
  const [escolha, setEscolhaInterna] = useState<EscolhaDeImagem>(inicial);
  const [trocando, setTrocando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previaLocal, setPreviaLocal] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [indicaMenor, setIndicaMenor] = useState(false);
  const [autorizacao, setAutorizacao] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<EtapaDoEnvio | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [anuncio, setAnuncio] = useState("");
  const entradaRef = useRef<HTMLInputElement>(null);
  const altRef = useRef<HTMLInputElement>(null);
  const mensagemRef = useRef<HTMLDivElement>(null);
  const trocarRef = useRef<HTMLButtonElement>(null);
  const escolhaRef = useRef<ControleDaEscolha>(null);
  const focoPendente = useRef<"alt" | "trocar" | "entrada" | null>(null);

  useEffect(() => {
    const alvo = focoPendente.current;
    if (!alvo) return;
    focoPendente.current = null;
    ({ alt: altRef, trocar: trocarRef, entrada: entradaRef })[alvo].current?.focus();
  });

  // Prévias locais são endereços temporários do navegador (blob:); a do
  // envio continua em uso na prévia depois de enviada, então todas são
  // liberadas só quando o campo sai da tela.
  const enderecosCriados = useRef<string[]>([]);
  useEffect(() => () => enderecosCriados.current.forEach((endereco) => URL.revokeObjectURL(endereco)), []);

  function setEscolha(nova: EscolhaDeImagem) {
    setEscolhaInterna(nova);
    aoMudar?.(nova);
  }

  function limparEnvio() {
    setArquivo(null);
    setPreviaLocal(null);
    setAlt("");
    setIndicaMenor(false);
    setAutorizacao(false);
    setErros({});
    setMensagem(null);
    if (entradaRef.current) entradaRef.current.value = "";
  }

  function receberArquivo(novo: File | undefined) {
    if (!novo) return;
    setMensagem(null);
    if (!TIPOS_ACEITOS.includes(novo.type)) {
      setArquivo(null);
      setPreviaLocal(null);
      setErros({ arquivo: novo.type === "image/svg+xml" ? MENSAGENS.svg : /heic|heif/.test(novo.type) || /\.(heic|heif)$/i.test(novo.name) ? MENSAGENS.heic : "Escolha uma imagem em JPEG, PNG ou WebP." });
      return;
    }
    setErros({});
    setArquivo(novo);
    const endereco = URL.createObjectURL(novo);
    enderecosCriados.current.push(endereco);
    setPreviaLocal(endereco);
    setAnuncio(`Imagem escolhida: ${novo.name}. Escreva o texto alternativo e envie.`);
    focoPendente.current = "alt";
  }

  function aoSoltar(evento: DragEvent<HTMLDivElement>) {
    evento.preventDefault();
    setArrastando(false);
    receberArquivo(evento.dataTransfer.files[0]);
  }

  async function enviar() {
    if (etapa || !arquivo) return;
    const novos: Erros = {};
    const altLido = validarAlt(alt);
    if (!altLido.ok) novos.alt = altLido.mensagem;
    const aviso = validarAvisoDeMenor(indicaMenor, autorizacao);
    if (aviso) novos.autorizacao = aviso;
    if (Object.keys(novos).length > 0 || !altLido.ok) {
      setErros(novos);
      setMensagem("Confira os campos marcados.");
      requestAnimationFrame(() => mensagemRef.current?.focus());
      return;
    }
    try {
      const resposta = await enviarArquivo({ arquivo, alt: altLido.alt, indicaMenor, autorizacao, dono }, setEtapa);
      if (!resposta.ok || !resposta.id) {
        setErros(resposta.erros ?? {});
        setMensagem(resposta.mensagem);
        requestAnimationFrame(() => mensagemRef.current?.focus());
        return;
      }
      // A prévia depois do envio usa a imagem local, com as medidas dela; o
      // site usa as variantes WebP geradas no servidor.
      const medidas = await lerMedidas(previaLocal);
      const nova: EscolhaDeImagem = {
        id: resposta.id,
        imagem: previaLocal ? { alt: altLido.alt, largura: medidas.largura, altura: medidas.altura, variantes: [{ largura: medidas.largura, url: previaLocal }] } : null,
      };
      setEscolha(nova);
      setArquivo(null);
      setAlt("");
      setIndicaMenor(false);
      setAutorizacao(false);
      setTrocando(false);
      setAnuncio(soEnvio ? "Imagem enviada e inserida." : "Imagem enviada. Ela vai para o site quando você salvar.");
      setPreviaLocal(null);
      focoPendente.current = soEnvio ? "entrada" : "trocar";
    } catch {
      setMensagem("Não foi possível enviar a imagem agora. Confira a conexão e tente de novo.");
      requestAnimationFrame(() => mensagemRef.current?.focus());
    } finally {
      setEtapa(null);
    }
  }

  function aoTeclarNoAlt(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== "Enter") return;
    evento.preventDefault();
    void enviar();
  }

  function remover() {
    setEscolha(null);
    setTrocando(false);
    limparEnvio();
    setAnuncio("Imagem removida. O site vai mostrar o espaço de imagem.");
    focoPendente.current = "entrada";
  }

  function aoEscolherDaBiblioteca(novoId: string, midia: MidiaNaTela | null) {
    setEscolha({ id: novoId, imagem: midia });
    setTrocando(false);
    limparEnvio();
    setAnuncio(midia ? `Imagem escolhida da biblioteca: ${midia.alt}` : "Imagem escolhida da biblioteca.");
  }

  const mostrandoEscolha = !soEnvio && escolha && !trocando;
  const enviando = etapa !== null;
  const idAjuda = `${id}-ajuda`;
  const descrito = (campo: keyof Erros) => (erros[campo] ? `${id}-${campo}-erro` : undefined);

  return (
    <fieldset className={estilos.campo} data-caixa-clara="" aria-describedby={[idAjuda, erro ? `${id}-erro` : undefined].filter(Boolean).join(" ")}>
      <legend className={estilos.rotulo}>{rotulo}</legend>
      {nome && <input type="hidden" name={nome} value={escolha?.id ?? ""} />}
      <p id={idAjuda} className={estilos.ajuda}>
        Proporção recomendada: {proporcao}. JPEG, PNG ou WebP; a imagem é reduzida para até 2560 px no lado maior antes do envio, e o site guarda só cópias em WebP, sem os dados da câmera e de localização.
      </p>

      {mostrandoEscolha ? (
        <div className={estilos.escolhida}>
          <div className={estilos.previa}>
            {escolha.imagem ? (
              <ImagemDaMidia
                variantes={escolha.imagem.variantes}
                alt={escolha.imagem.alt}
                largura={escolha.imagem.largura}
                altura={escolha.imagem.altura}
                sizes="200px"
                className={estilos.imagem}
              />
            ) : (
              <p className={estilos.indisponivel}>A imagem escolhida foi para a lixeira da biblioteca ou foi excluída. O site mostra o espaço de imagem.</p>
            )}
          </div>
          <div className={estilos.ladoDaPrevia}>
            {escolha.imagem && (
              <p className={estilos.texto}>
                <span className={estilos.legenda}>Texto alternativo:</span> {escolha.imagem.alt}
              </p>
            )}
            <div className={estilos.botoes}>
              <Botao
                ref={trocarRef}
                type="button"
                variante="secundario"
                onClick={() => {
                  setTrocando(true);
                  focoPendente.current = "entrada";
                }}
              >
                Trocar
              </Botao>
              <Botao type="button" variante="secundario" onClick={remover}>
                Remover
              </Botao>
            </div>
          </div>
        </div>
      ) : (
        <div className={estilos.envio}>
          <div
            className={`${estilos.zona} ${arrastando ? estilos.arrastando : ""} ${erros.arquivo ? estilos.zonaComErro : ""}`}
            onDragOver={(evento) => {
              evento.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={aoSoltar}
          >
            {previaLocal && arquivo ? (
              // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) antes do envio
              <img src={previaLocal} alt="" className={estilos.previaLocal} />
            ) : (
              <p className={estilos.texto}>Arraste uma imagem para cá ou</p>
            )}
            <label htmlFor={`${id}-arquivo`} className={estilos.botaoArquivo}>
              {arquivo ? "Escolher outra imagem" : "Escolher imagem"}
            </label>
            <input
              ref={entradaRef}
              id={`${id}-arquivo`}
              type="file"
              accept={TIPOS_ACEITOS.join(",")}
              className={estilos.entradaArquivo}
              onChange={(evento) => receberArquivo(evento.target.files?.[0])}
              aria-invalid={erros.arquivo ? true : undefined}
              aria-describedby={[idAjuda, descrito("arquivo")].filter(Boolean).join(" ")}
              disabled={enviando}
            />
            {arquivo && <p className={estilos.texto}>{arquivo.name} ({descreverTamanho(arquivo.size)})</p>}
          </div>
          {erros.arquivo && <p id={`${id}-arquivo-erro`} className={estilos.erro}>{erros.arquivo}</p>}

          {arquivo && (
            <>
              <div className={estilos.grupo}>
                <label htmlFor={`${id}-alt`} className={estilos.rotulo}>
                  Texto alternativo <span aria-hidden="true">*</span>
                </label>
                <p id={`${id}-alt-ajuda`} className={estilos.ajuda}>{ORIENTACAO_DO_ALT}</p>
                <input
                  ref={altRef}
                  id={`${id}-alt`}
                  type="text"
                  value={alt}
                  onChange={(evento) => setAlt(evento.target.value)}
                  onKeyDown={aoTeclarNoAlt}
                  maxLength={LIMITE_DO_ALT}
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={erros.alt ? true : undefined}
                  aria-describedby={[`${id}-alt-ajuda`, `${id}-alt-contador`, descrito("alt")].filter(Boolean).join(" ")}
                  className={`${estilos.entrada} ${erros.alt ? estilos.entradaComErro : ""}`}
                  disabled={enviando}
                />
                <p id={`${id}-alt-contador`} className={estilos.contador}>
                  {alt.length} de {LIMITE_DO_ALT} caracteres
                </p>
                {erros.alt && <p id={`${id}-alt-erro`} className={estilos.erro}>{erros.alt}</p>}
              </div>

              <fieldset className={estilos.grupoSemMoldura} aria-describedby={descrito("autorizacao")}>
                <legend className={estilos.rotulo}>Pessoas na imagem</legend>
                <label className={estilos.opcao}>
                  <input type="checkbox" checked={indicaMenor} onChange={(evento) => setIndicaMenor(evento.target.checked)} disabled={enviando} />
                  {TEXTO_INDICA_MENOR}
                </label>
                {indicaMenor && (
                  <label className={estilos.opcao}>
                    <input
                      type="checkbox"
                      checked={autorizacao}
                      onChange={(evento) => setAutorizacao(evento.target.checked)}
                      aria-required="true"
                      aria-invalid={erros.autorizacao ? true : undefined}
                      disabled={enviando}
                    />
                    {TEXTO_AUTORIZACAO} <span aria-hidden="true">*</span>
                  </label>
                )}
                {erros.autorizacao && <p id={`${id}-autorizacao-erro`} className={estilos.erro}>{erros.autorizacao}</p>}
              </fieldset>

              {enviando && (
                <div className={estilos.progresso}>
                  <progress aria-labelledby={`${id}-etapa`} />
                  <p id={`${id}-etapa`} className={estilos.texto}>
                    {etapa === "preparando" ? "Preparando a imagem..." : "Enviando e gerando as cópias para o site..."}
                  </p>
                </div>
              )}
              {mensagem && (
                <Mensagem tipo="erro" ref={mensagemRef}>
                  {mensagem}
                </Mensagem>
              )}

              <div className={estilos.botoes}>
                <Botao type="button" onClick={() => void enviar()} disabled={enviando}>
                  {enviando ? "Enviando..." : textoDoEnvio}
                </Botao>
                <Botao
                  type="button"
                  variante="secundario"
                  onClick={() => {
                    limparEnvio();
                    focoPendente.current = "entrada";
                  }}
                  disabled={enviando}
                >
                  Cancelar
                </Botao>
              </div>
            </>
          )}

          {!arquivo && trocando && (
            <div className={estilos.botoes}>
              <Botao
                type="button"
                variante="secundario"
                onClick={() => {
                  setTrocando(false);
                  focoPendente.current = "trocar";
                }}
              >
                Manter a imagem atual
              </Botao>
            </div>
          )}

          {!arquivo && !soEnvio && (
            <EscolhaDaBiblioteca
              controle={escolhaRef}
              soBiblioteca
              rotuloDaBiblioteca="Reutilizar imagem já enviada"
              jaEscolhidas={escolha ? [escolha.id] : []}
              aoEscolher={aoEscolherDaBiblioteca}
            />
          )}
        </div>
      )}

      {erro && <p id={`${id}-erro`} className={estilos.erro}>{erro}</p>}
      <p className="somente-leitor" aria-live="polite">{anuncio}</p>
    </fieldset>
  );
}

// Medidas da imagem local (para a prévia guardar a proporção).
function lerMedidas(endereco: string | null): Promise<{ largura: number; altura: number }> {
  return new Promise((resolver) => {
    if (!endereco) return resolver({ largura: 1, altura: 1 });
    const imagem = new Image();
    imagem.onload = () => resolver({ largura: imagem.naturalWidth || 1, altura: imagem.naturalHeight || 1 });
    imagem.onerror = () => resolver({ largura: 1, altura: 1 });
    imagem.src = endereco;
  });
}
