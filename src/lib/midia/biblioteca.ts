// Biblioteca de mídia (etapa 4d): processamento das imagens e gravação no
// Storage e no Firestore. Roda SÓ no servidor (usa o sharp e o Admin SDK).
// Não depende de sessão nem de ação de servidor, e não importa "server-only",
// para ser usado também pelo script de migração (etapa 6, fotos de
// profissionais) e pelos testes no emulador, como src/lib/loja/contas.ts.
// Quem chama confere sessão e papel antes (acoes-midia.ts). As instâncias do
// Firebase chegam por parâmetro (ver servicos.ts).
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Storage } from "firebase-admin/storage";
import sharp from "sharp";
import { registrarNoLote, type AutorDaAlteracao } from "../log/alteracoes.ts";
import {
  CACHE_DAS_IMAGENS,
  LIMITE_DO_ARQUIVO_EM_BYTES,
  MENSAGENS,
  PIXELS_MAXIMOS_NA_ENTRADA,
  QUALIDADE_WEBP,
  caminhoDaVariante,
  detectarFormato,
  escolherLarguras,
  mensagemDoFormato,
  pastaDaMidia,
  validarAlt,
  validarAvisoDeMenor,
  type PastaDaMidia,
} from "./regras.ts";

export const COLECAO_MIDIAS = "midias";

type Bucket = ReturnType<Storage["bucket"]>;
export type ServicosDeMidia = { db: Firestore; bucket: Bucket };

export type VarianteGerada = { largura: number; altura: number; dados: Buffer };
export type VarianteGravada = { largura: number; caminho: string; tamanho: number };

type Falha = { ok: false; mensagem: string; campo?: "arquivo" | "alt" | "autorizacao" };

// Campos de referência a uma mídia em outras coleções. Cada campo de imagem
// do painel (fatias 3a a 3d) acrescenta a sua linha aqui, e a exclusão avisa
// em quais registros a imagem está em uso. campoDoNome identifica o registro
// na tela (nome ou título, já públicos no site).
export const REFERENCIAS_DE_MIDIA: { colecao: string; campo: string; rotulo: string; campoDoNome: string }[] = [
  { colecao: "profissionais", campo: "fotoMidiaId", rotulo: "Profissionais (foto)", campoDoNome: "nome" },
];

export type UsoDaMidia = { rotulo: string; registros: string[] };

// Abre a imagem, confere o tipo real e gera as variantes WebP. A rotação do
// EXIF é aplicada ANTES de tudo (autoOrient) e o sharp não copia metadados
// para a saída: EXIF, GPS e perfil de câmera ficam para trás.
export async function prepararVariantes(
  bytes: Uint8Array,
): Promise<{ ok: true; largura: number; altura: number; variantes: VarianteGerada[] } | Falha> {
  if (bytes.length === 0) return { ok: false, mensagem: MENSAGENS.semArquivo, campo: "arquivo" };
  if (bytes.length > LIMITE_DO_ARQUIVO_EM_BYTES) return { ok: false, mensagem: MENSAGENS.grande, campo: "arquivo" };

  const formato = detectarFormato(bytes);
  const recusa = mensagemDoFormato(formato);
  if (recusa) return { ok: false, mensagem: recusa, campo: "arquivo" };

  const abrir = () => sharp(bytes, { failOn: "error", limitInputPixels: PIXELS_MAXIMOS_NA_ENTRADA, animated: false });
  try {
    const metadados = await abrir().metadata();
    // A assinatura e o decodificador precisam concordar (ex.: PNG com início de JPEG).
    if (metadados.format !== formato) return { ok: false, mensagem: MENSAGENS.outroFormato, campo: "arquivo" };
    const { width: largura, height: altura } = metadados.autoOrient;
    const variantes: VarianteGerada[] = [];
    for (const larguraDaVariante of escolherLarguras(largura)) {
      const { data, info } = await abrir()
        .autoOrient()
        .resize({ width: larguraDaVariante, withoutEnlargement: true })
        .webp({ quality: QUALIDADE_WEBP })
        .toBuffer({ resolveWithObject: true });
      variantes.push({ largura: info.width, altura: info.height, dados: data });
    }
    return { ok: true, largura, altura, variantes };
  } catch (erro) {
    const texto = erro instanceof Error ? erro.message : "";
    return { ok: false, mensagem: /pixel limit/i.test(texto) ? MENSAGENS.medidas : MENSAGENS.ilegivel, campo: "arquivo" };
  }
}

export type DadosDoEnvio = {
  bytes: Uint8Array;
  alt: unknown;
  indicaMenor: boolean;
  autorizacaoConfirmada: boolean;
};

// Envio completo: valida, processa, grava as variantes em publico/ e cria o
// documento em midias junto com o registro de alteração. Se algo falhar
// depois de gravar arquivos, eles são apagados.
export async function enviarImagem(
  { db, bucket }: ServicosDeMidia,
  dados: DadosDoEnvio,
  autor: AutorDaAlteracao,
): Promise<{ ok: true; id: string } | Falha> {
  const alt = validarAlt(dados.alt);
  if (!alt.ok) return { ok: false, mensagem: alt.mensagem, campo: "alt" };
  const aviso = validarAvisoDeMenor(dados.indicaMenor, dados.autorizacaoConfirmada);
  if (aviso) return { ok: false, mensagem: aviso, campo: "autorizacao" };

  const preparo = await prepararVariantes(dados.bytes);
  if (!preparo.ok) return preparo;

  const referencia = db.collection(COLECAO_MIDIAS).doc();
  const gravadas: VarianteGravada[] = [];
  try {
    for (const variante of preparo.variantes) {
      const caminho = caminhoDaVariante("publico", referencia.id, variante.largura);
      await bucket.file(caminho).save(variante.dados, {
        resumable: false,
        metadata: { contentType: "image/webp", cacheControl: CACHE_DAS_IMAGENS },
      });
      gravadas.push({ largura: variante.largura, caminho, tamanho: variante.dados.length });
    }

    const lote = db.batch();
    lote.create(referencia, {
      caminhoStorage: pastaDaMidia("publico", referencia.id),
      tipo: "imagem",
      alt: alt.alt,
      largura: preparo.largura,
      altura: preparo.altura,
      tamanho: dados.bytes.length,
      variantes: gravadas,
      enviadoPor: autor.uid,
      indicaMenor: dados.indicaMenor,
      autorizacaoConfirmadaPor: dados.indicaMenor ? autor.uid : null,
      autorizacaoConfirmadaEm: dados.indicaMenor ? FieldValue.serverTimestamp() : null,
      criadoEm: FieldValue.serverTimestamp(),
      excluidoEm: null,
    });
    registrarNoLote(db, lote, autor, {
      colecao: COLECAO_MIDIAS,
      documentoId: referencia.id,
      acao: "criar",
      campos: ["alt", "variantes", "indicaMenor"],
      resumo: "Imagem enviada para a biblioteca.",
    });
    await lote.commit();
    return { ok: true, id: referencia.id };
  } catch (erro) {
    await Promise.all(gravadas.map((variante) => bucket.file(variante.caminho).delete({ ignoreNotFound: true }).catch(() => undefined)));
    throw erro;
  }
}

type DocumentoDeMidia = { variantes: VarianteGravada[]; excluidoEm: unknown };

async function lerDocumento(db: Firestore, id: string): Promise<DocumentoDeMidia | null> {
  const documento = await db.collection(COLECAO_MIDIAS).doc(id).get();
  if (!documento.exists) return null;
  const variantes = documento.get("variantes");
  return { variantes: Array.isArray(variantes) ? variantes : [], excluidoEm: documento.get("excluidoEm") ?? null };
}

export async function editarAlt(
  { db }: ServicosDeMidia,
  id: string,
  valor: unknown,
  autor: AutorDaAlteracao,
): Promise<{ ok: true } | Falha> {
  const alt = validarAlt(valor);
  if (!alt.ok) return { ok: false, mensagem: alt.mensagem, campo: "alt" };
  if (!(await lerDocumento(db, id))) return { ok: false, mensagem: "Imagem não encontrada." };
  const lote = db.batch();
  lote.update(db.collection(COLECAO_MIDIAS).doc(id), { alt: alt.alt });
  registrarNoLote(db, lote, autor, { colecao: COLECAO_MIDIAS, documentoId: id, acao: "editar", campos: ["alt"], resumo: "Texto alternativo alterado." });
  await lote.commit();
  return { ok: true };
}

// Uma imagem só pode ser escolhida num formulário se existe e está fora da
// lixeira (campos fotoMidiaId e parecidos).
export async function midiaPodeSerEscolhida(db: Firestore, id: string): Promise<boolean> {
  const atual = await lerDocumento(db, id);
  return Boolean(atual && !atual.excluidoEm && atual.variantes.length > 0);
}

// Onde a imagem está em uso: para cada referência cadastrada em
// REFERENCIAS_DE_MIDIA, os registros que apontam para ela (os que estão na
// lixeira daquela coleção aparecem marcados, porque voltam se restaurados).
export async function listarUsos(db: Firestore, id: string): Promise<UsoDaMidia[]> {
  const usos = await Promise.all(
    REFERENCIAS_DE_MIDIA.map(async ({ colecao, campo, rotulo, campoDoNome }) => {
      const encontrados = await db.collection(colecao).where(campo, "==", id).select(campoDoNome, "excluidoEm").get();
      const registros = encontrados.docs
        .map((documento) => {
          const nome = String(documento.get(campoDoNome) ?? "").trim() || "Sem nome";
          return documento.get("excluidoEm") ? `${nome} (na lixeira)` : nome;
        })
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      return { rotulo, registros };
    }),
  );
  return usos.filter((uso) => uso.registros.length > 0);
}

// Move os arquivos de uma pasta para a outra e devolve os novos caminhos.
// Se um movimento falhar, desfaz os que já foram feitos.
async function moverArquivos(bucket: Bucket, id: string, variantes: VarianteGravada[], destino: PastaDaMidia): Promise<VarianteGravada[]> {
  const movidas: { de: string; para: string }[] = [];
  try {
    for (const variante of variantes) {
      const para = caminhoDaVariante(destino, id, variante.largura);
      await bucket.file(variante.caminho).move(para);
      movidas.push({ de: variante.caminho, para });
    }
  } catch (erro) {
    for (const movida of movidas.reverse()) await bucket.file(movida.para).move(movida.de).catch(() => undefined);
    throw erro;
  }
  return variantes.map((variante) => ({ ...variante, caminho: caminhoDaVariante(destino, id, variante.largura) }));
}

// "Excluir": os arquivos vão de publico/ para lixeira/ (saem do ar na hora,
// sem ser apagados) e o documento ganha excluidoEm. "Restaurar" faz o caminho
// de volta.
export async function moverParaLixeiraOuRestaurar(
  { db, bucket }: ServicosDeMidia,
  id: string,
  excluir: boolean,
  autor: AutorDaAlteracao,
): Promise<{ ok: true } | Falha> {
  const atual = await lerDocumento(db, id);
  if (!atual) return { ok: false, mensagem: "Imagem não encontrada." };
  if (excluir === Boolean(atual.excluidoEm)) {
    return { ok: false, mensagem: excluir ? "A imagem já está na lixeira." : "A imagem não está na lixeira." };
  }
  const destino: PastaDaMidia = excluir ? "lixeira" : "publico";
  const variantes = await moverArquivos(bucket, id, atual.variantes, destino);
  try {
    const lote = db.batch();
    lote.update(db.collection(COLECAO_MIDIAS).doc(id), {
      caminhoStorage: pastaDaMidia(destino, id),
      variantes,
      excluidoEm: excluir ? FieldValue.serverTimestamp() : null,
    });
    registrarNoLote(db, lote, autor, {
      colecao: COLECAO_MIDIAS,
      documentoId: id,
      acao: excluir ? "excluir" : "restaurar",
      campos: ["excluidoEm", "caminhoStorage", "variantes"],
      resumo: excluir ? "Imagem movida para a lixeira." : "Imagem restaurada da lixeira.",
    });
    await lote.commit();
  } catch (erro) {
    await moverArquivos(bucket, id, variantes, excluir ? "publico" : "lixeira").catch(() => undefined);
    throw erro;
  }
  return { ok: true };
}

// "Excluir de vez": só para imagem que já está na lixeira. Apaga os arquivos
// e o documento; o registro de alteração fica.
export async function excluirDeVez({ db, bucket }: ServicosDeMidia, id: string, autor: AutorDaAlteracao): Promise<{ ok: true } | Falha> {
  const atual = await lerDocumento(db, id);
  if (!atual) return { ok: false, mensagem: "Imagem não encontrada." };
  if (!atual.excluidoEm) return { ok: false, mensagem: "Mova a imagem para a lixeira antes de excluir de vez." };
  await Promise.all(atual.variantes.map((variante) => bucket.file(variante.caminho).delete({ ignoreNotFound: true })));
  const lote = db.batch();
  lote.delete(db.collection(COLECAO_MIDIAS).doc(id));
  registrarNoLote(db, lote, autor, {
    colecao: COLECAO_MIDIAS,
    documentoId: id,
    acao: "excluir_definitivo",
    campos: [],
    resumo: "Imagem excluída de vez, com os arquivos.",
  });
  await lote.commit();
  return { ok: true };
}
