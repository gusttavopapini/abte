// Vídeo de "Quem Somos" (30/10/2026): política de envio assinada, conferência
// do objeto enviado e gravação da referência em configuracoes/home, com o
// registro em logAlteracoes. Sem server-only, como as outras gravações: quem
// chama (acoes-home.ts) confere sessão e papel antes. O Storage e o
// Firestore chegam por parâmetro; a assinatura também, para os testes no
// emulador (que não assina políticas).
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Storage } from "firebase-admin/storage";
import { registrarNaTransacao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { midiaPodeSerEscolhida } from "../midia/biblioteca.ts";
import { COLECAO_DA_HOME, DOCUMENTO_DA_HOME } from "../site/home.ts";
import {
  IDENTIFICADOR_DO_VIDEO,
  VALIDADE_DO_ENVIO_EM_MS,
  camposAlteradosDoVideo,
  caminhoDoEnvio,
  condicoesDoEnvio,
  conferirMetadados,
  ehCaminhoDoArquivo,
  legendaValida,
  lerVideoQuemSomos,
  validarPedidoDeEnvio,
  type ArquivoDoVideo,
  type VideoQuemSomos,
} from "../site/videoQuemSomos.ts";

type Bucket = ReturnType<Storage["bucket"]>;
export type PoliticaDeEnvio = { url: string; campos: Record<string, string> };
export type Assinador = (bucket: Bucket, caminho: string, contentType: string, condicoes: (string | number)[][]) => Promise<PoliticaDeEnvio>;

// Assinatura de verdade (POST V4 do Cloud Storage), válida por 10 minutos.
export const assinarPolitica: Assinador = async (bucket, caminho, contentType, condicoes) => {
  const [politica] = await bucket.file(caminho).generateSignedPostPolicyV4({
    expires: Date.now() + VALIDADE_DO_ENVIO_EM_MS,
    conditions: condicoes as never,
    fields: { "Content-Type": contentType },
  });
  return { url: politica.url, campos: politica.fields as Record<string, string> };
};

export async function prepararEnvioDoVideo(
  bucket: Bucket,
  pedido: { arquivo: unknown; contentType: unknown; tamanho: unknown },
  novoId: string,
  assinar: Assinador = assinarPolitica,
): Promise<{ ok: true; caminho: string; politica: PoliticaDeEnvio } | { ok: false; mensagem: string }> {
  const lido = validarPedidoDeEnvio(pedido);
  if (!lido.ok) return lido;
  const caminho = caminhoDoEnvio(lido.arquivo, novoId, lido.contentType);
  const politica = await assinar(bucket, caminho, lido.contentType, condicoesDoEnvio(lido.contentType, lido.limite));
  return { ok: true, caminho, politica };
}

// Confere o objeto enviado pelo navegador (existência, tamanho e tipo reais
// nos metadados; a legenda também pelo conteúdo). Arquivo recusado é apagado.
export async function conferirEnvioDoVideo(bucket: Bucket, arquivo: ArquivoDoVideo, caminho: unknown): Promise<{ ok: true; caminho: string; contentType: string; tamanho: number } | { ok: false; mensagem: string }> {
  if (!ehCaminhoDoArquivo(arquivo, caminho)) return { ok: false, mensagem: "Envio não reconhecido. Envie o arquivo de novo." };
  const objeto = bucket.file(caminho);
  const [existe] = await objeto.exists();
  if (!existe) return { ok: false, mensagem: "O arquivo não chegou ao armazenamento. Envie de novo." };
  const [metadados] = await objeto.getMetadata();
  const tamanho = Number(metadados.size ?? 0);
  const contentType = metadados.contentType;
  const conferido = conferirMetadados(arquivo, { tamanho, contentType });
  let recusa = conferido.ok ? null : conferido.mensagem;
  if (!recusa && arquivo === "legenda") {
    const [conteudo] = await objeto.download();
    if (!legendaValida(conteudo.toString("utf8"))) recusa = "A legenda não está no formato WebVTT (o arquivo precisa começar com WEBVTT).";
  }
  if (recusa) {
    await objeto.delete({ ignoreNotFound: true });
    return { ok: false, mensagem: recusa };
  }
  return { ok: true, caminho, contentType: contentType as string, tamanho };
}

export const MENSAGEM_CAPA_DO_VIDEO_INDISPONIVEL = "A imagem de capa não está mais na biblioteca (foi para a lixeira ou excluída). Envie ou escolha outra.";

// Grava (ou remove, com null) o vídeo; o registro leva só os nomes do que
// mudou. A capa nova precisa estar na biblioteca, fora da lixeira.
export async function salvarVideoQuemSomos(db: Firestore, video: VideoQuemSomos | null, autor: AutorDaAlteracao): Promise<{ ok: true; alterados: string[] } | { ok: false; mensagem: string; campo?: "capaMidiaId" }> {
  const referencia = db.collection(COLECAO_DA_HOME).doc(DOCUMENTO_DA_HOME);
  return db.runTransaction(async (transacao) => {
    const documento = await transacao.get(referencia);
    const antes = lerVideoQuemSomos(documento.get("videoQuemSomos"));
    if (video?.capaMidiaId && video.capaMidiaId !== antes?.capaMidiaId && !(await midiaPodeSerEscolhida(db, video.capaMidiaId))) return { ok: false, mensagem: MENSAGEM_CAPA_DO_VIDEO_INDISPONIVEL, campo: "capaMidiaId" };
    const alterados = camposAlteradosDoVideo(antes, video);
    const gravado = video
      ? {
          ...video,
          dono: { tipo: "home", id: IDENTIFICADOR_DO_VIDEO, campo: "video" },
          ...(video.indicaMenor && !antes?.indicaMenor ? { autorizacaoConfirmadaPor: autor.uid, autorizacaoConfirmadaEm: FieldValue.serverTimestamp() } : {}),
          atualizadoEm: FieldValue.serverTimestamp(),
        }
      : null;
    // O campo é trocado inteiro (update), sem mistura com o vídeo anterior,
    // que um set com merge faria.
    if (documento.exists) transacao.update(referencia, { videoQuemSomos: gravado, atualizadoEm: FieldValue.serverTimestamp() });
    else transacao.set(referencia, { videoQuemSomos: gravado, atualizadoEm: FieldValue.serverTimestamp() });
    registrarNaTransacao(db, transacao, autor, {
      colecao: COLECAO_DA_HOME,
      documentoId: DOCUMENTO_DA_HOME,
      acao: "editar",
      campos: alterados.length > 0 ? ["videoQuemSomos"] : [],
      resumo: alterados.length > 0 ? `Vídeo de "Quem Somos": ${alterados.join(", ")}.` : `Vídeo de "Quem Somos" salvo sem alterações.`,
    });
    return { ok: true, alterados };
  });
}
