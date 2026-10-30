// Biblioteca de mídia (etapa 4d): processamento das imagens e gravação no
// Storage e no Firestore. Roda SÓ no servidor (usa o sharp e o Admin SDK).
// Não depende de sessão nem de ação de servidor, e não importa "server-only",
// para ser usado também pelo script de migração (etapa 6,
// scripts/migrar-imagens.mts) e pelos testes no emulador, como src/lib/loja/contas.ts.
// Quem chama confere sessão e papel antes (acoes-midia.ts). As instâncias do
// Firebase chegam por parâmetro (ver servicos.ts).
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Storage } from "firebase-admin/storage";
import sharp from "sharp";
import type { OrigemDaMidia } from "../dados/tipos.ts";
import { donoDoDocumento, idsDasImagensNoTexto, precisaCompletarDono, type CampoDoDono, type DonoDaMidia, type TipoDeDono } from "./dono.ts";
import { registrarNoLote, type Alteracao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import {
  CACHE_DAS_IMAGENS,
  LADO_MAXIMO_NO_NAVEGADOR,
  LIMITE_DO_ARQUIVO_EM_BYTES,
  MENSAGENS,
  PIXELS_MAXIMOS_NA_ENTRADA,
  QUALIDADE_WEBP,
  SAIDA_DO_NAVEGADOR,
  caminhoDaVariante,
  detectarFormato,
  escolherLarguras,
  mensagemDoFormato,
  pastaDaMidia,
  validarAlt,
  validarAvisoDeMenor,
  type FormatoAceito,
  type PastaDaMidia,
} from "./regras.ts";

export const COLECAO_MIDIAS = "midias";

// Falha ao desfazer ou limpar arquivos: vai para o log do servidor com o id
// da mídia e a mensagem técnica (só caminhos do bucket, sem dados pessoais),
// para alguém conferir depois (ver scripts/midia-orfas.mts).
function registrarFalhaDeArquivo(id: string, etapa: string, erro: unknown): void {
  console.error(`Mídia ${id}: falha ao ${etapa}.`, erro instanceof Error ? erro.message : String(erro));
}

type Bucket = ReturnType<Storage["bucket"]>;
export type ServicosDeMidia = { db: Firestore; bucket: Bucket };

export type VarianteGerada = { largura: number; altura: number; dados: Buffer };
export type VarianteGravada = { largura: number; caminho: string; tamanho: number };

type Falha = { ok: false; mensagem: string; campo?: "arquivo" | "alt" | "autorizacao" };

// Campos de referência a uma mídia em outras coleções. Cada campo de imagem
// do painel (fatias 3a a 3d) acrescenta a sua linha aqui, e a exclusão avisa
// em quais registros a imagem está em uso. campoDoNome identifica o registro
// na tela (nome ou título, já públicos no site). emLista: o campo é uma lista
// de objetos e o id fica na chave indicada (ex.: produtos.imagens[].midiaId);
// essas coleções são lidas inteiras (pequenas) e filtradas aqui. emMarkdown:
// o campo é um texto em Markdown restrito e a imagem aparece como
// ![alt](midia:ID) (corpo dos posts importados, desde 23/10/2026); também
// lido inteiro e filtrado aqui.
export type ReferenciaDeMidia = { colecao: string; campo: string; rotulo: string; campoDoNome: string; emLista?: string; emMarkdown?: boolean };

export const REFERENCIAS_DE_MIDIA: ReferenciaDeMidia[] = [
  { colecao: "profissionais", campo: "fotoMidiaId", rotulo: "Profissionais (foto)", campoDoNome: "nome" },
  { colecao: "diretoria", campo: "fotoMidiaId", rotulo: "Diretoria (foto)", campoDoNome: "nome" },
  { colecao: "posts", campo: "capaMidiaId", rotulo: "Posts do blog (capa)", campoDoNome: "titulo" },
  { colecao: "posts", campo: "conteudo", emMarkdown: true, rotulo: "Posts do blog (imagem no texto)", campoDoNome: "titulo" },
  { colecao: "artigos", campo: "imagemMidiaId", rotulo: "Artigos (imagem)", campoDoNome: "titulo" },
  { colecao: "categoriasDeArtigos", campo: "imagemMidiaId", rotulo: "Categorias de artigos (imagem)", campoDoNome: "nome" },
  { colecao: "produtos", campo: "imagens", emLista: "midiaId", rotulo: "Produtos (galeria)", campoDoNome: "nome" },
  { colecao: "categoriasDeProdutos", campo: "imagemMidiaId", rotulo: "Categorias de produtos (imagem)", campoDoNome: "nome" },
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
  // Envio pelo formulário de um item (29/10/2026, lib/midia/dono.ts); sem
  // dono, o envio direto na biblioteca.
  dono?: DonoDaMidia | null;
};

// Grava as variantes em publico/ e cria o documento em midias junto com o
// registro de alteração (os dois entram ou nenhum entra). Se algo falhar
// depois de gravar arquivos, eles são apagados. Comum ao envio pelo painel e
// à importação do site antigo.
async function gravarNaBiblioteca(
  { db, bucket }: ServicosDeMidia,
  variantes: VarianteGerada[],
  documento: (gravadas: VarianteGravada[], id: string) => Record<string, unknown>,
  autor: AutorDaAlteracao,
  alteracao: Omit<Alteracao, "colecao" | "documentoId" | "acao">,
): Promise<string> {
  const referencia = db.collection(COLECAO_MIDIAS).doc();
  const gravadas: VarianteGravada[] = [];
  try {
    for (const variante of variantes) {
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
      variantes: gravadas,
      ...documento(gravadas, referencia.id),
      criadoEm: FieldValue.serverTimestamp(),
      excluidoEm: null,
    });
    registrarNoLote(db, lote, autor, { colecao: COLECAO_MIDIAS, documentoId: referencia.id, acao: "criar", ...alteracao });
    await lote.commit();
    return referencia.id;
  } catch (erro) {
    await Promise.all(
      gravadas.map((variante) =>
        bucket
          .file(variante.caminho)
          .delete({ ignoreNotFound: true })
          .catch((falha: unknown) => registrarFalhaDeArquivo(referencia.id, "apagar arquivo de um envio que falhou", falha)),
      ),
    );
    throw erro;
  }
}

// Envio completo pelo painel: valida, processa e grava.
export async function enviarImagem(
  servicos: ServicosDeMidia,
  dados: DadosDoEnvio,
  autor: AutorDaAlteracao,
): Promise<{ ok: true; id: string } | Falha> {
  const alt = validarAlt(dados.alt);
  if (!alt.ok) return { ok: false, mensagem: alt.mensagem, campo: "alt" };
  const aviso = validarAvisoDeMenor(dados.indicaMenor, dados.autorizacaoConfirmada);
  if (aviso) return { ok: false, mensagem: aviso, campo: "autorizacao" };

  const preparo = await prepararVariantes(dados.bytes);
  if (!preparo.ok) return preparo;

  const id = await gravarNaBiblioteca(
    servicos,
    preparo.variantes,
    () => ({
      alt: alt.alt,
      largura: preparo.largura,
      altura: preparo.altura,
      tamanho: dados.bytes.length,
      enviadoPor: autor.uid,
      indicaMenor: dados.indicaMenor,
      autorizacaoConfirmadaPor: dados.indicaMenor ? autor.uid : null,
      autorizacaoConfirmadaEm: dados.indicaMenor ? FieldValue.serverTimestamp() : null,
      ...(dados.dono ? { dono: dados.dono } : {}),
    }),
    autor,
    dados.dono
      ? { campos: ["alt", "variantes", "indicaMenor", "dono"], resumo: "Imagem enviada pelo formulário de um item." }
      : { campos: ["alt", "variantes", "indicaMenor"], resumo: "Imagem enviada para a biblioteca." },
  );
  return { ok: true, id };
}

// Imagem baixada do site antigo (etapa 6), com o mesmo teto do envio pelo
// painel. Só reduz quando passa do lado máximo (2560 px) ou do limite de
// tamanho, e aí faz o mesmo que o navegador: aplica a rotação do EXIF, reduz
// sem ampliar, pinta as áreas transparentes de branco e gera JPEG de
// qualidade 92. Dentro dos limites, vai como veio (sem regravar em JPEG); em
// todos os casos prepararVariantes confere o tipo e recodifica em WebP, sem
// metadados.
export async function ajustarComoNoNavegador(
  bytes: Uint8Array,
): Promise<{ ok: true; bytes: Uint8Array; formato: FormatoAceito; reduzida: boolean } | (Falha & { formato: string })> {
  const formato = detectarFormato(bytes);
  const recusa = mensagemDoFormato(formato);
  if (formato !== "jpeg" && formato !== "png" && formato !== "webp") {
    return { ok: false, mensagem: recusa ?? MENSAGENS.outroFormato, campo: "arquivo", formato };
  }
  const abrir = () => sharp(bytes, { failOn: "error", limitInputPixels: PIXELS_MAXIMOS_NA_ENTRADA, animated: false });
  try {
    const { width: largura, height: altura } = (await abrir().metadata()).autoOrient;
    if (Math.max(largura, altura) <= LADO_MAXIMO_NO_NAVEGADOR && bytes.length <= LIMITE_DO_ARQUIVO_EM_BYTES) {
      return { ok: true, bytes, formato, reduzida: false };
    }
    const reduzida = await abrir()
      .autoOrient()
      .resize({ width: LADO_MAXIMO_NO_NAVEGADOR, height: LADO_MAXIMO_NO_NAVEGADOR, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: Math.round(SAIDA_DO_NAVEGADOR.qualidade * 100) })
      .toBuffer();
    if (reduzida.length > LIMITE_DO_ARQUIVO_EM_BYTES) return { ok: false, mensagem: MENSAGENS.grande, campo: "arquivo", formato };
    return { ok: true, bytes: reduzida, formato, reduzida: true };
  } catch (erro) {
    const texto = erro instanceof Error ? erro.message : "";
    return { ok: false, mensagem: /pixel limit/i.test(texto) ? MENSAGENS.medidas : MENSAGENS.ilegivel, campo: "arquivo", formato };
  }
}

export type DadosDaImportacao = {
  // Já ajustados por ajustarComoNoNavegador.
  bytes: Uint8Array;
  alt: unknown;
  origem: OrigemDaMidia;
  // false só quando o alt veio pronto do site antigo (resposta 2 de
  // 22/10/2026); sem o campo, o alt é provisório.
  altProvisorio?: boolean;
};

// Importação de uma imagem do site antigo (etapa 6). Diferenças do envio pelo
// painel: guarda a origem (só o id da mídia no sistema antigo, nunca o
// endereço), marca o alt como provisório (salvo quando veio pronto do site
// antigo) e a conferência de menores como
// pendente, e não grava indicaMenor nem a autorização (ninguém confirmou nada).
// O registro de alteração leva origem "migracao" e a execução.
export async function importarImagem(
  servicos: ServicosDeMidia,
  dados: DadosDaImportacao,
  autor: AutorDaAlteracao,
): Promise<{ ok: true; id: string } | Falha> {
  const alt = validarAlt(dados.alt);
  if (!alt.ok) return { ok: false, mensagem: alt.mensagem, campo: "alt" };
  const preparo = await prepararVariantes(dados.bytes);
  if (!preparo.ok) return preparo;

  const id = await gravarNaBiblioteca(
    servicos,
    preparo.variantes,
    () => ({
      alt: alt.alt,
      altProvisorio: dados.altProvisorio !== false,
      largura: preparo.largura,
      altura: preparo.altura,
      tamanho: dados.bytes.length,
      enviadoPor: autor.uid,
      conferenciaDeMenor: "pendente",
      origem: { sistema: dados.origem.sistema, midiaId: dados.origem.midiaId, execucao: dados.origem.execucao },
    }),
    autor,
    {
      campos: ["alt", "variantes", "origem"],
      resumo: "Imagem importada do site antigo.",
      origem: "migracao",
      execucao: dados.origem.execucao,
    },
  );
  return { ok: true, id };
}

type DocumentoDeMidia = { variantes: VarianteGravada[]; excluidoEm: unknown; altProvisorio: boolean };

async function lerDocumento(db: Firestore, id: string): Promise<DocumentoDeMidia | null> {
  const documento = await db.collection(COLECAO_MIDIAS).doc(id).get();
  if (!documento.exists) return null;
  const variantes = documento.get("variantes");
  return {
    variantes: Array.isArray(variantes) ? variantes : [],
    excluidoEm: documento.get("excluidoEm") ?? null,
    altProvisorio: documento.get("altProvisorio") === true,
  };
}

export async function editarAlt(
  { db }: ServicosDeMidia,
  id: string,
  valor: unknown,
  autor: AutorDaAlteracao,
): Promise<{ ok: true } | Falha> {
  const alt = validarAlt(valor);
  if (!alt.ok) return { ok: false, mensagem: alt.mensagem, campo: "alt" };
  const atual = await lerDocumento(db, id);
  if (!atual) return { ok: false, mensagem: "Imagem não encontrada." };
  // Alt editado por uma pessoa deixa de ser o provisório da migração.
  const campos = atual.altProvisorio ? { alt: alt.alt, altProvisorio: false } : { alt: alt.alt };
  const lote = db.batch();
  lote.update(db.collection(COLECAO_MIDIAS).doc(id), campos);
  registrarNoLote(db, lote, autor, { colecao: COLECAO_MIDIAS, documentoId: id, acao: "editar", campos: Object.keys(campos), resumo: "Texto alternativo alterado." });
  await lote.commit();
  return { ok: true };
}

// Uma imagem só pode ser escolhida num formulário se existe e está fora da
// lixeira (campos fotoMidiaId e parecidos).
export async function midiaPodeSerEscolhida(db: Firestore, id: string): Promise<boolean> {
  const atual = await lerDocumento(db, id);
  return Boolean(atual && !atual.excluidoEm && atual.variantes.length > 0);
}

// Confere a imagem escolhida num formulário antes de gravar: sem imagem, ou a
// mesma que já estava gravada (pode ter ido para a lixeira depois e volta se
// restaurada), passa; uma imagem nova precisa existir e estar fora da lixeira.
export async function escolhaDeMidiaValida(db: Firestore, escolhida: string | null, anterior: unknown): Promise<boolean> {
  if (!escolhida || escolhida === anterior) return true;
  return midiaPodeSerEscolhida(db, escolhida);
}

// Várias imagens escolhidas de uma vez (galeria do produto): cada uma precisa
// passar em escolhaDeMidiaValida, comparada com as que já estavam gravadas.
export async function escolhasDeMidiaValidas(db: Firestore, escolhidas: string[], anteriores: string[]): Promise<boolean> {
  const novas = escolhidas.filter((id) => !anteriores.includes(id));
  const resultados = await Promise.all(novas.map((id) => midiaPodeSerEscolhida(db, id)));
  return resultados.every(Boolean);
}

// Item novo salvo (29/10/2026): as imagens enviadas pelo formulário dele
// ainda têm o dono sem id. Recebem o id do item só as que têm o mesmo tipo e
// campo e o id vazio; imagem sem dono (antiga ou da biblioteca) ou de outro
// item fica como está. Cada imagem ligada ganha uma linha no registro.
// Devolve quantas foram ligadas.
export async function completarDonoDasMidias(
  db: Firestore,
  ids: (string | null | undefined)[],
  tipo: TipoDeDono,
  campo: CampoDoDono,
  idDoItem: string,
  autor: AutorDaAlteracao,
): Promise<number> {
  const unicos = [...new Set(ids.filter((id): id is string => typeof id === "string" && id.length > 0))];
  if (unicos.length === 0) return 0;
  const documentos = await db.getAll(...unicos.map((id) => db.collection(COLECAO_MIDIAS).doc(id)));
  const lote = db.batch();
  let ligadas = 0;
  for (const documento of documentos) {
    if (!documento.exists || !precisaCompletarDono(donoDoDocumento(documento.get("dono")), tipo, campo)) continue;
    lote.update(documento.ref, { "dono.id": idDoItem });
    registrarNoLote(db, lote, autor, { colecao: COLECAO_MIDIAS, documentoId: documento.id, acao: "editar", campos: ["dono"], resumo: "Imagem ligada ao item salvo." });
    ligadas++;
  }
  if (ligadas > 0) await lote.commit();
  return ligadas;
}

export type UsoNoItem = { rotulo: string; nome: string; naLixeira: boolean };

// Onde cada imagem está em uso, numa leitura só de cada coleção (tela
// /admin/midia: "Usada em"). Mesmas referências de REFERENCIAS_DE_MIDIA.
export async function mapaDeUsos(db: Firestore): Promise<Map<string, UsoNoItem[]>> {
  const mapa = new Map<string, UsoNoItem[]>();
  const anotar = (id: unknown, uso: UsoNoItem) => {
    if (typeof id !== "string" || !id) return;
    const lista = mapa.get(id) ?? [];
    if (!lista.some((existente) => existente.rotulo === uso.rotulo && existente.nome === uso.nome)) lista.push(uso);
    mapa.set(id, lista);
  };
  for (const { colecao, campo, rotulo, campoDoNome, emLista, emMarkdown } of REFERENCIAS_DE_MIDIA) {
    const encontrados = await db.collection(colecao).select(campoDoNome, "excluidoEm", campo).get();
    for (const documento of encontrados.docs) {
      const uso = { rotulo, nome: String(documento.get(campoDoNome) ?? "").trim() || "Sem nome", naLixeira: Boolean(documento.get("excluidoEm")) };
      const valor = documento.get(campo);
      if (emMarkdown) for (const id of idsDasImagensNoTexto(String(valor ?? ""))) anotar(id, uso);
      else if (emLista) for (const item of Array.isArray(valor) ? valor : []) anotar(item?.[emLista], uso);
      else anotar(valor, uso);
    }
  }
  return mapa;
}

// Onde a imagem está em uso: para cada referência cadastrada em
// REFERENCIAS_DE_MIDIA, os registros que apontam para ela (os que estão na
// lixeira daquela coleção aparecem marcados, porque voltam se restaurados).
export async function listarUsos(db: Firestore, id: string): Promise<UsoDaMidia[]> {
  const usos = await Promise.all(
    REFERENCIAS_DE_MIDIA.map(async ({ colecao, campo, rotulo, campoDoNome, emLista, emMarkdown }) => {
      const consulta = emLista || emMarkdown ? db.collection(colecao) : db.collection(colecao).where(campo, "==", id);
      const encontrados = await consulta.select(campoDoNome, "excluidoEm", campo).get();
      const registros = encontrados.docs
        .filter((documento) => {
          if (emMarkdown) return String(documento.get(campo) ?? "").includes(`](midia:${id})`);
          if (!emLista) return true;
          const lista = documento.get(campo);
          return Array.isArray(lista) && lista.some((item) => item?.[emLista] === id);
        })
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

// Move um arquivo, sem travar quando já foi movido: se a origem não existe e
// o destino existe, conta como movido (ex.: uma tentativa anterior parou no
// meio). Devolve false nesse caso, para não ser desfeito.
async function moverUm(bucket: Bucket, de: string, para: string): Promise<boolean> {
  const [origemExiste] = await bucket.file(de).exists();
  if (origemExiste) {
    await bucket.file(de).move(para);
    return true;
  }
  const [destinoExiste] = await bucket.file(para).exists();
  if (destinoExiste) return false;
  throw new Error(`Arquivo da mídia não encontrado: ${de}`);
}

// Move os arquivos de uma pasta para a outra e devolve os novos caminhos.
// Repetir conserta uma divisão (parte em publico/, parte em lixeira/). Se um
// movimento falhar, desfaz os que foram feitos nesta chamada; falha ao
// desfazer vai para o log do servidor.
async function moverArquivos(bucket: Bucket, id: string, variantes: VarianteGravada[], destino: PastaDaMidia): Promise<VarianteGravada[]> {
  const origem: PastaDaMidia = destino === "lixeira" ? "publico" : "lixeira";
  const movidas: { de: string; para: string }[] = [];
  try {
    for (const variante of variantes) {
      const de = caminhoDaVariante(origem, id, variante.largura);
      const para = caminhoDaVariante(destino, id, variante.largura);
      if (await moverUm(bucket, de, para)) movidas.push({ de, para });
    }
  } catch (erro) {
    for (const movida of movidas.reverse()) {
      await bucket
        .file(movida.para)
        .move(movida.de)
        .catch((falha: unknown) => registrarFalhaDeArquivo(id, `devolver ${movida.para} para ${movida.de}`, falha));
    }
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
    await moverArquivos(bucket, id, variantes, excluir ? "publico" : "lixeira").catch((falha: unknown) =>
      registrarFalhaDeArquivo(id, "devolver os arquivos depois de uma gravação que falhou", falha),
    );
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
