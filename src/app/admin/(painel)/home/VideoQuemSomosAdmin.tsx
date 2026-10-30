"use client";

import { useActionState, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { CaixaDoPainel } from "@/app/admin/_componentes/CaixaDoPainel/CaixaDoPainel";
import { TEXTO_AUTORIZACAO } from "@/app/admin/_componentes/EnviarMidia/EnviarMidia";
import { ImagemDoItem } from "@/app/admin/_componentes/ImagemDoItem/ImagemDoItem";
import { confirmarEnvioDoVideoDaHome, prepararEnvioDoVideoDaHome, salvarVideoDaHome } from "@/app/admin/acoes-home";
import { Botao } from "@/components/Botao/Botao";
import { ImagemDaMidia } from "@/components/ImagemDaMidia/ImagemDaMidia";
import { Mensagem } from "@/components/Mensagem/Mensagem";
import { Modal } from "@/components/Modal/Modal";
import type { ImagemNaTela } from "@/lib/midia/tela";
import {
  DURACAO_RECOMENDADA,
  IDENTIFICADOR_DO_VIDEO,
  LIMITE_DA_DESCRICAO_DO_VIDEO,
  LIMITE_DA_LEGENDA_EM_BYTES,
  LIMITE_DO_VIDEO_EM_BYTES,
  PROPORCAO_DO_VIDEO,
  TIPOS_DE_VIDEO,
  TIPO_DA_LEGENDA,
  type ArquivoDoVideo,
  type VideoQuemSomos,
} from "@/lib/site/videoQuemSomos";
import estilos from "./HomeAdminClient.module.css";

// Mesmo aviso do envio de imagens (texto PROVISÓRIO, como aquele).
const TEXTO_VIDEO_INDICA_MENOR = "O vídeo mostra criança ou adolescente";

type Envio = { caminho: string; contentType: string; tamanho: number };
type Forma = "arquivo" | "youtube";

const MENSAGEM_DE_BLOQUEIO =
  "O envio direto ao armazenamento não foi aceito. Se for a primeira vez, o administrador precisa liberar o envio no bucket (CORS, arquivo docs/infra/cors.json). Enquanto isso, use um link do YouTube.";

// Envia um arquivo direto ao bucket (30/10/2026): política assinada pelo
// servidor, POST do navegador (com progresso) e conferência no servidor. O
// arquivo não passa pela função da Vercel.
async function enviarDireto(arquivo: File, tipo: ArquivoDoVideo, aoProgresso: (fracao: number) => void): Promise<{ ok: true; envio: Envio } | { ok: false; mensagem: string }> {
  const contentType = tipo === "legenda" ? TIPO_DA_LEGENDA : arquivo.type;
  const preparo = await prepararEnvioDoVideoDaHome({ arquivo: tipo, contentType, tamanho: arquivo.size });
  if (!preparo.ok) return preparo;
  const corpo = new FormData();
  for (const [campo, valor] of Object.entries(preparo.campos)) corpo.append(campo, valor);
  corpo.append("file", arquivo);
  const enviado = await new Promise<boolean>((resolver) => {
    const pedido = new XMLHttpRequest();
    pedido.open("POST", preparo.url);
    pedido.upload.onprogress = (evento) => {
      if (evento.lengthComputable) aoProgresso(evento.loaded / evento.total);
    };
    pedido.onload = () => resolver(pedido.status >= 200 && pedido.status < 300);
    pedido.onerror = () => resolver(false);
    pedido.send(corpo);
  });
  if (!enviado) return { ok: false, mensagem: MENSAGEM_DE_BLOQUEIO };
  const conferido = await confirmarEnvioDoVideoDaHome({ arquivo: tipo, caminho: preparo.caminho });
  if (!conferido.ok) return conferido;
  return { ok: true, envio: { caminho: conferido.caminho, contentType: conferido.contentType, tamanho: conferido.tamanho } };
}

function megabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

// Campo de envio de um arquivo (vídeo ou legenda), com progresso e erro.
function EnvioDeArquivo({ id, tipo, rotulo, ajuda, aceitar, enviado, aoEnviar, aoRemover, erro }: { id: string; tipo: ArquivoDoVideo; rotulo: string; ajuda: string; aceitar: string; enviado: string | null; aoEnviar: (envio: Envio) => void; aoRemover: () => void; erro?: string }) {
  const [progresso, setProgresso] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setMensagem(null);
    const legendaPeloNome = tipo === "legenda" && /\.vtt$/i.test(arquivo.name);
    if (tipo === "video" && !Object.hasOwn(TIPOS_DE_VIDEO, arquivo.type)) return setMensagem("Envie o vídeo em MP4 (H.264) ou WebM.");
    if (tipo === "video" && arquivo.size > LIMITE_DO_VIDEO_EM_BYTES) return setMensagem(`O vídeo tem ${megabytes(arquivo.size)} e passa de 60 MB. Envie um arquivo menor ou use um link do YouTube.`);
    if (tipo === "legenda" && !legendaPeloNome && arquivo.type !== TIPO_DA_LEGENDA) return setMensagem("A legenda precisa ser um arquivo .vtt (WebVTT).");
    if (tipo === "legenda" && arquivo.size > LIMITE_DA_LEGENDA_EM_BYTES) return setMensagem("A legenda passa de 200 KB.");
    setProgresso(0);
    try {
      const resultado = await enviarDireto(arquivo, tipo, setProgresso);
      if (resultado.ok) aoEnviar(resultado.envio);
      else setMensagem(resultado.mensagem);
    } catch {
      setMensagem(MENSAGEM_DE_BLOQUEIO);
    } finally {
      setProgresso(null);
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className={estilos.grupo}>
      <label htmlFor={id} className={estilos.rotulo}>{rotulo}</label>
      <p id={`${id}-ajuda`} className={estilos.ajuda}>{ajuda}</p>
      {enviado && (
        <div className={estilos.posicao}>
          <span className={estilos.etiqueta}>{tipo === "video" ? "Vídeo enviado" : "Legenda enviada"}</span>
          <Botao type="button" variante="secundario" onClick={aoRemover}>
            {tipo === "video" ? "Trocar o vídeo" : "Remover a legenda"}
          </Botao>
        </div>
      )}
      {!enviado && (
        <input ref={entrada} id={id} type="file" accept={aceitar} onChange={(evento) => void escolher(evento.target.files?.[0])} disabled={progresso !== null} aria-describedby={[`${id}-ajuda`, erro || mensagem ? `${id}-erro` : ""].filter(Boolean).join(" ")} className={estilos.entrada} />
      )}
      {progresso !== null && (
        <div className={estilos.posicao}>
          <progress value={progresso} max={1} aria-label={`Enviando ${tipo === "video" ? "o vídeo" : "a legenda"}`} />
          <span className={estilos.ajuda} aria-live="polite">{Math.round(progresso * 100)}% enviado</span>
        </div>
      )}
      {(mensagem || erro) && <p id={`${id}-erro`} className={estilos.erro}>{mensagem ?? erro}</p>}
    </div>
  );
}

function FormularioDoVideo({ video, capa, aoTerminar, aoCancelar }: { video: VideoQuemSomos | null; capa: ImagemNaTela | null; aoTerminar: (mensagem: string) => void; aoCancelar: () => void }) {
  const id = useId();
  const [resposta, salvar, salvando] = useActionState(salvarVideoDaHome, null);
  const [forma, setForma] = useState<Forma>(video?.tipo === "arquivo" ? "arquivo" : "youtube");
  const [youtube, setYoutube] = useState(video?.tipo === "youtube" ? `https://youtu.be/${video.youtubeId}` : "");
  const [arquivo, setArquivo] = useState<Envio | null>(video?.tipo === "arquivo" ? { caminho: video.caminho, contentType: video.contentType, tamanho: video.tamanho } : null);
  const [legenda, setLegenda] = useState<string | null>(video?.legendaCaminho ?? null);
  const [descricao, setDescricao] = useState(video?.descricao ?? "");
  const [indicaMenor, setIndicaMenor] = useState(video?.indicaMenor ?? false);
  const [autorizacao, setAutorizacao] = useState(video?.indicaMenor ?? false);
  const [remover, setRemover] = useState(false);
  const resumo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resposta?.ok) aoTerminar(resposta.mensagem);
    else if (resposta) resumo.current?.focus();
  }, [resposta, aoTerminar]);

  const erros = resposta?.ok === false ? resposta.erros ?? {} : {};
  return (
    <form action={salvar} className={estilos.formulario}>
      <input type="hidden" name="forma" value={remover ? "nenhum" : forma} />
      {forma === "arquivo" && arquivo && (
        <>
          <input type="hidden" name="caminho" value={arquivo.caminho} />
          <input type="hidden" name="contentType" value={arquivo.contentType} />
          <input type="hidden" name="tamanho" value={arquivo.tamanho} />
        </>
      )}
      <input type="hidden" name="legendaCaminho" value={legenda ?? ""} />
      {resposta?.ok === false && (
        <Mensagem tipo="erro" ref={resumo}>
          {resposta.mensagem}
        </Mensagem>
      )}
      <p className={estilos.ajuda}>
        Proporção recomendada: {PROPORCAO_DO_VIDEO.texto}. Tamanho recomendado: {PROPORCAO_DO_VIDEO.tamanho}. Duração recomendada: {DURACAO_RECOMENDADA}.
      </p>
      <CaixaDoPainel tipo="informacao">Vídeo com fala precisa de legendas (arquivo .vtt) para quem não ouve.</CaixaDoPainel>

      <fieldset className={estilos.grupoSemMoldura} aria-describedby={erros.forma ? `${id}-forma-erro` : undefined}>
        <legend className={estilos.rotulo}>Como o vídeo entra</legend>
        <div className={estilos.opcoesDoFoco}>
          <label className={estilos.opcao}>
            <input type="radio" name="formaEscolhida" value="arquivo" checked={forma === "arquivo"} onChange={() => setForma("arquivo")} />
            Enviar arquivo de vídeo
          </label>
          <label className={estilos.opcao}>
            <input type="radio" name="formaEscolhida" value="youtube" checked={forma === "youtube"} onChange={() => setForma("youtube")} />
            Link do YouTube
          </label>
        </div>
        {erros.forma && <p id={`${id}-forma-erro`} className={estilos.erro}>{erros.forma}</p>}
      </fieldset>

      {forma === "arquivo" ? (
        <EnvioDeArquivo
          id={`${id}-arquivo`}
          tipo="video"
          rotulo="Arquivo de vídeo"
          ajuda="MP4 (H.264) ou WebM, até 60 MB. O arquivo vai direto para o armazenamento, com o progresso aqui."
          aceitar="video/mp4,video/webm"
          enviado={arquivo?.caminho ?? null}
          aoEnviar={setArquivo}
          aoRemover={() => setArquivo(null)}
          erro={erros.caminho}
        />
      ) : (
        <div className={estilos.grupo}>
          <label htmlFor={`${id}-youtube`} className={estilos.rotulo}>Link do YouTube</label>
          <p id={`${id}-youtube-ajuda`} className={estilos.ajuda}>Endereço do vídeo em youtube.com ou youtu.be. No site, ele aparece pelo youtube-nocookie.com e só carrega depois do clique.</p>
          <input id={`${id}-youtube`} name="youtube" type="text" inputMode="url" value={youtube} onChange={(evento) => setYoutube(evento.target.value)} autoComplete="off" spellCheck={false} aria-invalid={erros.youtube ? true : undefined} aria-describedby={[`${id}-youtube-ajuda`, erros.youtube ? `${id}-youtube-erro` : ""].filter(Boolean).join(" ")} className={`${estilos.entrada} ${erros.youtube ? estilos.entradaComErro : ""}`} />
          {erros.youtube && <p id={`${id}-youtube-erro`} className={estilos.erro}>{erros.youtube}</p>}
        </div>
      )}

      <div className={estilos.grupo}>
        <label htmlFor={`${id}-descricao`} className={estilos.rotulo}>
          Descrição do vídeo <span aria-hidden="true">*</span>
        </label>
        <p id={`${id}-descricao-ajuda`} className={estilos.ajuda}>O que o vídeo mostra, em uma frase. É o nome do vídeo para quem usa leitor de tela.</p>
        <input id={`${id}-descricao`} name="descricao" type="text" value={descricao} onChange={(evento) => setDescricao(evento.target.value)} maxLength={LIMITE_DA_DESCRICAO_DO_VIDEO} aria-required="true" autoComplete="off" aria-invalid={erros.descricao ? true : undefined} aria-describedby={[`${id}-descricao-ajuda`, `${id}-descricao-contador`, erros.descricao ? `${id}-descricao-erro` : ""].filter(Boolean).join(" ")} className={`${estilos.entrada} ${erros.descricao ? estilos.entradaComErro : ""}`} />
        <p id={`${id}-descricao-contador`} className={estilos.contador}>{descricao.length} de {LIMITE_DA_DESCRICAO_DO_VIDEO} caracteres</p>
        {erros.descricao && <p id={`${id}-descricao-erro`} className={estilos.erro}>{erros.descricao}</p>}
      </div>

      <ImagemDoItem
        nome="capaMidiaId"
        rotulo="Imagem de capa (opcional)"
        inicial={video?.capaMidiaId ? { id: video.capaMidiaId, imagem: capa } : null}
        dono={{ tipo: "home", id: IDENTIFICADOR_DO_VIDEO, campo: "videoCapa" }}
        proporcao={PROPORCAO_DO_VIDEO.texto}
        tamanho={PROPORCAO_DO_VIDEO.tamanho}
        moldura={{ razao: PROPORCAO_DO_VIDEO.razao, estreita: true, rotulo: "Prévia da capa" }}
        erro={erros.capaMidiaId}
      />

      <EnvioDeArquivo
        id={`${id}-legenda`}
        tipo="legenda"
        rotulo="Legenda (opcional)"
        ajuda="Arquivo .vtt (WebVTT), até 200 KB. Aparece no player como legenda em português."
        aceitar=".vtt,text/vtt"
        enviado={legenda}
        aoEnviar={(envio) => setLegenda(envio.caminho)}
        aoRemover={() => setLegenda(null)}
        erro={erros.legendaCaminho}
      />

      <fieldset className={estilos.grupoSemMoldura} aria-describedby={erros.autorizacao ? `${id}-autorizacao-erro` : undefined}>
        <legend className={estilos.rotulo}>Pessoas no vídeo</legend>
        <label className={estilos.opcao}>
          <input type="checkbox" name="indicaMenor" value="sim" checked={indicaMenor} onChange={(evento) => setIndicaMenor(evento.target.checked)} />
          {TEXTO_VIDEO_INDICA_MENOR}
        </label>
        {indicaMenor && (
          <label className={estilos.opcao}>
            <input type="checkbox" name="autorizacao" value="sim" checked={autorizacao} onChange={(evento) => setAutorizacao(evento.target.checked)} aria-required="true" />
            {TEXTO_AUTORIZACAO} <span aria-hidden="true">*</span>
          </label>
        )}
        {erros.autorizacao && <p id={`${id}-autorizacao-erro`} className={estilos.erro}>{erros.autorizacao}</p>}
      </fieldset>

      {video && !remover && (
        <div>
          <Botao type="button" variante="secundario" onClick={() => setRemover(true)}>
            Remover o vídeo
          </Botao>
        </div>
      )}
      {remover && (
        <CaixaDoPainel tipo="atencao" titulo="Remover o vídeo de Quem Somos?">
          <p>Ao salvar, a home volta ao espaço padrão do vídeo. O arquivo continua no armazenamento.</p>
          <div className={estilos.botoes}>
            <Botao type="button" variante="secundario" onClick={() => setRemover(false)}>
              Manter o vídeo
            </Botao>
            <Botao type="submit" disabled={salvando}>
              Remover e salvar
            </Botao>
          </div>
        </CaixaDoPainel>
      )}

      <div className={estilos.botoes}>
        <Botao type="button" variante="secundario" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </Botao>
        {!remover && (
          <Botao type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Botao>
        )}
      </div>
    </form>
  );
}

// Cartão "Vídeo de Quem Somos" de /admin/home (30/10/2026) e o Modal.
export function VideoQuemSomosAdmin({ video, capa, aoTerminar }: { video: VideoQuemSomos | null; capa: ImagemNaTela | null; aoTerminar: (mensagem: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const titulo = "Vídeo de Quem Somos";
  return (
    <section className={estilos.secao} aria-labelledby="titulo-video">
      <h2 id="titulo-video" className="tipo-texto-lg">{titulo}</h2>
      <ul role="list" className={estilos.grade}>
        <li className={estilos.cartao}>
          <div className={estilos.miniatura} style={{ "--razao": PROPORCAO_DO_VIDEO.razao } as CSSProperties}>
            {capa ? <ImagemDaMidia variantes={capa.variantes} alt="" largura={capa.largura} altura={capa.altura} sizes="160px" className={estilos.imagem} /> : <span className={estilos.semImagem}>{video ? "Sem capa" : "Padrão do site"}</span>}
          </div>
          <div className={estilos.texto}>
            <h3 className={estilos.nome}>{titulo}</h3>
            <p className={estilos.etiquetas}>
              <span className={estilos.etiqueta}>{IDENTIFICADOR_DO_VIDEO}</span>
              <span className={`${estilos.etiqueta} ${video ? estilos.ativo : ""}`}>{video ? (video.tipo === "youtube" ? "YouTube" : "Arquivo de vídeo") : "Sem vídeo"}</span>
              {video && !video.legendaCaminho && <span className={estilos.etiqueta}>Sem legenda</span>}
            </p>
            <p className={estilos.detalhe}>{video ? `Descrição: ${video.descricao}` : "Onde aparece: ao lado de Missão, Visão e Valores. Sem vídeo, a home mostra \"Vídeo em breve\"."}</p>
          </div>
          <div className={estilos.acoes}>
            <Botao variante="secundario" onClick={() => setAberto(true)} aria-label={`Editar o ${titulo.toLowerCase()}`}>
              Editar
            </Botao>
          </div>
        </li>
      </ul>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo={titulo} largura="larga">
        {aberto && (
          <FormularioDoVideo
            video={video}
            capa={capa}
            aoTerminar={(mensagem) => {
              setAberto(false);
              aoTerminar(mensagem);
            }}
            aoCancelar={() => setAberto(false)}
          />
        )}
      </Modal>
    </section>
  );
}
