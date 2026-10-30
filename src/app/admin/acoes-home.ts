"use server";

// Ações de servidor das imagens da home (29/10/2026, /admin/home). Cada uma
// começa por exigirPapelDoPainel("home.editar") (tabela em
// src/lib/auth/papeis.ts) e chama a gravação (src/lib/gravacao/home.ts), que
// registra em logAlteracoes. Ao salvar, a home é revalidada e a mudança
// aparece sem novo deploy.
import { revalidatePath } from "next/cache";
import { autorDaAlteracao, exigirPapelDoPainel } from "@/lib/auth/sessao";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { excluirBanner, salvarBanner, salvarImagemDoEspaco } from "@/lib/gravacao/home";
import { headers } from "next/headers";
import { conferirEnvioDoVideo, gerarCapaDoYoutube, prepararEnvioDoVideo, prepararEnvioRetomavel, salvarVideoQuemSomos } from "@/lib/gravacao/videoQuemSomos";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import type { ImagemNaTela } from "@/lib/midia/tela";
import { idDoYoutubeDoLink } from "@/lib/site/video";
import { servicosDeMidia } from "@/lib/midia/servicos";
import { lerVideoDoFormulario, type CampoDoVideo } from "@/lib/site/videoQuemSomos";
import { ehChaveDeBanner, lerBannerDoFormulario, lerImagemDoEspacoDoFormulario, type CampoDoBanner } from "@/lib/site/home";

export type RespostaDaHome = { ok: boolean; mensagem: string; erros?: Partial<Record<CampoDoBanner, string>> } | null;

export type RespostaDoVideo = { ok: boolean; mensagem: string; erros?: Partial<Record<CampoDoVideo, string>>; aviso?: string } | null;

const ERRO_GENERICO = "Não foi possível salvar agora. Tente de novo em instantes.";

function atualizarPaginas() {
  revalidatePath("/");
  revalidatePath("/admin/home");
  revalidatePath("/admin/midia");
}

export async function salvarBannerDaHome(_anterior: RespostaDaHome, dados: FormData): Promise<RespostaDaHome> {
  const usuario = await exigirPapelDoPainel("home.editar");
  const lido = lerBannerDoFormulario({
    chave: dados.get("chave"),
    midiaId: dados.get("midiaId"),
    midiaMobileId: dados.get("midiaMobileId"),
    alt: dados.get("alt"),
    href: dados.get("href"),
    ativo: dados.get("ativo"),
    posicao: dados.get("posicao"),
    pontoDeFoco: dados.get("pontoDeFoco"),
    midiaTabletId: dados.get("midiaTabletId"),
    titulo: dados.get("titulo"),
    trechoEmDestaque: dados.get("trechoEmDestaque"),
    subtitulo: dados.get("subtitulo"),
    textoDoBotao: dados.get("textoDoBotao"),
    posicaoDoTexto: dados.get("posicaoDoTexto"),
  });
  if (!lido.ok) return { ok: false, mensagem: lido.mensagem, erros: lido.erros };
  try {
    const gravado = await salvarBanner(firestoreAdmin(), lido.dados, autorDaAlteracao(usuario));
    if (!gravado.ok) return gravado.campo ? { ok: false, mensagem: "Confira os campos marcados.", erros: { [gravado.campo]: gravado.mensagem } } : { ok: false, mensagem: gravado.mensagem };
    atualizarPaginas();
    return { ok: true, mensagem: `${gravado.nome} salvo. A home já mostra a mudança.` };
  } catch (erro) {
    console.error("Falha ao salvar o banner da home:", erro);
    return { ok: false, mensagem: ERRO_GENERICO };
  }
}

export async function excluirBannerDaHome(_anterior: RespostaDaHome, dados: FormData): Promise<RespostaDaHome> {
  const usuario = await exigirPapelDoPainel("home.editar");
  const chave = dados.get("chave");
  if (!ehChaveDeBanner(chave)) return { ok: false, mensagem: "Banner não encontrado. Recarregue a página." };
  try {
    const excluido = await excluirBanner(firestoreAdmin(), chave, autorDaAlteracao(usuario));
    if (!excluido.ok) return { ok: false, mensagem: excluido.mensagem };
    atualizarPaginas();
    return { ok: true, mensagem: `${excluido.nome} excluído. A imagem continua na biblioteca.` };
  } catch (erro) {
    console.error("Falha ao excluir o banner da home:", erro);
    return { ok: false, mensagem: "Não foi possível excluir agora. Tente de novo em instantes." };
  }
}

export async function salvarImagemDaSecao(_anterior: RespostaDaHome, dados: FormData): Promise<RespostaDaHome> {
  const usuario = await exigirPapelDoPainel("home.editar");
  const lido = lerImagemDoEspacoDoFormulario({
    identificador: dados.get("identificador"),
    midiaId: dados.get("midiaId"),
    midiaMobileId: dados.get("midiaMobileId"),
    alt: dados.get("alt"),
  });
  if (!lido.ok) return { ok: false, mensagem: lido.mensagem, erros: lido.erros };
  try {
    const gravado = await salvarImagemDoEspaco(firestoreAdmin(), lido.identificador, lido.imagem, autorDaAlteracao(usuario));
    if (!gravado.ok) return gravado.campo ? { ok: false, mensagem: "Confira os campos marcados.", erros: { [gravado.campo]: gravado.mensagem } } : { ok: false, mensagem: gravado.mensagem };
    atualizarPaginas();
    return { ok: true, mensagem: lido.imagem.midiaId ? `Imagem de "${gravado.nome}" salva. A home já mostra a mudança.` : `Imagem de "${gravado.nome}" removida. A home volta a mostrar o espaço padrão.` };
  } catch (erro) {
    console.error("Falha ao salvar a imagem da seção da home:", erro);
    return { ok: false, mensagem: ERRO_GENERICO };
  }
}

// ---------- Vídeo de "Quem Somos" (30/10/2026) ----------
function bucketEDb() {
  return servicosDeMidia();
}
// O arquivo não passa por aqui: prepararEnvioDoVideoDaHome devolve a
// política assinada (POST V4, tipo e tamanho limitados, caminho próprio,
// validade curta), o navegador envia direto ao bucket e
// confirmarEnvioDoVideoDaHome confere o objeto antes de valer.
export type RespostaDoPreparo = { ok: true; caminho: string; url: string; campos: Record<string, string> } | { ok: false; mensagem: string };

export async function prepararEnvioDoVideoDaHome(pedido: { arquivo: "video" | "legenda"; contentType: string; tamanho: number }): Promise<RespostaDoPreparo> {
  await exigirPapelDoPainel("home.editar");
  try {
    const { bucket } = servicosDeMidia();
    const preparado = await prepararEnvioDoVideo(bucket, pedido, firestoreAdmin().collection("_").doc().id);
    if (!preparado.ok) return preparado;
    return { ok: true, caminho: preparado.caminho, url: preparado.politica.url, campos: preparado.politica.campos };
  } catch (erro) {
    console.error("Falha ao preparar o envio do vídeo:", erro);
    return { ok: false, mensagem: "Não foi possível preparar o envio agora. Tente de novo em instantes ou use um link do YouTube." };
  }
}

export type RespostaDaConfirmacao = { ok: true; caminho: string; contentType: string; tamanho: number } | { ok: false; mensagem: string };

export async function confirmarEnvioDoVideoDaHome(pedido: { arquivo: "video" | "legenda"; caminho: string }): Promise<RespostaDaConfirmacao> {
  await exigirPapelDoPainel("home.editar");
  if (pedido.arquivo !== "video" && pedido.arquivo !== "legenda") return { ok: false, mensagem: "Envio não reconhecido." };
  try {
    return await conferirEnvioDoVideo(servicosDeMidia().bucket, pedido.arquivo, pedido.caminho);
  } catch (erro) {
    console.error("Falha ao conferir o envio do vídeo:", erro);
    return { ok: false, mensagem: "Não foi possível conferir o arquivo enviado. Tente de novo em instantes." };
  }
}

export async function salvarVideoDaHome(_anterior: RespostaDoVideo, dados: FormData): Promise<RespostaDoVideo> {
  const usuario = await exigirPapelDoPainel("home.editar");
  const lido = lerVideoDoFormulario({
    forma: dados.get("forma"),
    youtube: dados.get("youtube"),
    caminho: dados.get("caminho"),
    contentType: dados.get("contentType"),
    tamanho: dados.get("tamanho"),
    descricao: dados.get("descricao"),
    capaMidiaId: dados.get("capaMidiaId"),
    legendaCaminho: dados.get("legendaCaminho"),
    indicaMenor: dados.get("indicaMenor"),
    autorizacao: dados.get("autorizacao"),
  });
  if (!lido.ok) return { ok: false, mensagem: lido.mensagem, erros: lido.erros };
  try {
    // O arquivo de vídeo e a legenda são conferidos de novo no bucket.
    const { bucket } = servicosDeMidia();
    if (lido.video?.tipo === "arquivo") {
      const conferido = await conferirEnvioDoVideo(bucket, "video", lido.video.caminho);
      if (!conferido.ok) return { ok: false, mensagem: "Confira os campos marcados.", erros: { caminho: conferido.mensagem } };
      lido.video = { ...lido.video, contentType: conferido.contentType as "video/mp4" | "video/webm", tamanho: conferido.tamanho };
    }
    // YouTube sem capa: o servidor baixa a miniatura do próprio YouTube e a
    // grava como capa; se não der, salva sem capa e avisa.
    let aviso: string | undefined;
    if (lido.video?.tipo === "youtube" && !lido.video.capaMidiaId) {
      const capa = await gerarCapaDoYoutube(bucketEDb(), { youtubeId: lido.video.youtubeId, descricao: lido.video.descricao }, autorDaAlteracao(usuario));
      if (capa.ok) lido.video = { ...lido.video, capaMidiaId: capa.capaMidiaId };
      else aviso = "Não foi possível gerar a capa a partir do YouTube. Envie uma imagem de capa para o vídeo.";
    }
    if (lido.video?.legendaCaminho) {
      const legenda = await conferirEnvioDoVideo(bucket, "legenda", lido.video.legendaCaminho);
      if (!legenda.ok) return { ok: false, mensagem: "Confira os campos marcados.", erros: { legendaCaminho: legenda.mensagem } };
    }
    const gravado = await salvarVideoQuemSomos(firestoreAdmin(), lido.video, autorDaAlteracao(usuario));
    if (!gravado.ok) return { ok: false, mensagem: "Confira os campos marcados.", erros: gravado.campo ? { [gravado.campo]: gravado.mensagem } : {} };
    atualizarPaginas();
    return { ok: true, mensagem: lido.video ? "Vídeo de Quem Somos salvo. A home já mostra a mudança." : "Vídeo de Quem Somos removido. A home volta ao padrão.", aviso };
  } catch (erro) {
    console.error("Falha ao salvar o vídeo de Quem Somos:", erro);
    return { ok: false, mensagem: ERRO_GENERICO };
  }
}

// Sessão retomável para o arquivo de vídeo (até 1 GB), presa à origem do
// painel; o navegador envia em partes direto ao bucket.
export type RespostaDaSessao = { ok: true; caminho: string; sessao: string } | { ok: false; mensagem: string };

export async function prepararEnvioRetomavelDaHome(pedido: { contentType: string; tamanho: number }): Promise<RespostaDaSessao> {
  await exigirPapelDoPainel("home.editar");
  try {
    const cabecalhos = await headers();
    const origem = cabecalhos.get("origin") ?? `https://${cabecalhos.get("host") ?? ""}`;
    const { bucket } = servicosDeMidia();
    return await prepararEnvioRetomavel(bucket, pedido, firestoreAdmin().collection("_").doc().id, origem);
  } catch (erro) {
    console.error("Falha ao abrir a sessão de envio do vídeo:", erro);
    return { ok: false, mensagem: "Não foi possível preparar o envio agora. Tente de novo em instantes ou use um link do YouTube." };
  }
}

// "Gerar capa de novo a partir do YouTube": grava uma capa nova para o link
// do formulário (ainda não salvo) e a devolve para a prévia.
export type RespostaDaCapa = { ok: true; capaMidiaId: string; imagem: ImagemNaTela | null } | { ok: false; mensagem: string };

export async function gerarCapaDoYoutubeDaHome(pedido: { youtube: string; descricao: string }): Promise<RespostaDaCapa> {
  const usuario = await exigirPapelDoPainel("home.editar");
  const youtubeId = idDoYoutubeDoLink(pedido.youtube ?? "");
  if (!youtubeId) return { ok: false, mensagem: "Cole o link de um vídeo do YouTube antes de gerar a capa." };
  const descricao = (pedido.descricao ?? "").trim().replace(/\s+/g, " ").slice(0, 300);
  if (!descricao) return { ok: false, mensagem: "Escreva a descrição do vídeo antes: ela vira o texto alternativo da capa." };
  try {
    const capa = await gerarCapaDoYoutube(bucketEDb(), { youtubeId, descricao }, autorDaAlteracao(usuario));
    if (!capa.ok) return capa;
    const imagem = (await imagensAtivasPorId([capa.capaMidiaId])).get(capa.capaMidiaId) ?? null;
    return { ok: true, capaMidiaId: capa.capaMidiaId, imagem };
  } catch (erro) {
    console.error("Falha ao gerar a capa do vídeo:", erro);
    return { ok: false, mensagem: "Não foi possível gerar a capa agora. Envie uma imagem de capa." };
  }
}
