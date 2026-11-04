// Gravação das imagens da home (29/10/2026) no documento configuracoes/home,
// com o registro em logAlteracoes na mesma transação. Sem server-only, como
// as outras gravações: o Firestore e o autor chegam por parâmetro e quem
// chama (acoes-home.ts) confere sessão e papel antes. O registro leva só os
// nomes do que mudou e o nome do espaço, nunca os valores.
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { registrarNaTransacao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { MENSAGENS_DA_LIXEIRA, confirmacaoDeExclusaoValida } from "../lixeira.ts";
import { midiaPodeSerEscolhida } from "../midia/biblioteca.ts";
import {
  COLECAO_DA_HOME,
  DOCUMENTO_DA_HOME,
  ESPACOS_DA_HOME,
  LIMITE_DE_BANNERS,
  camposAlteradosDoBanner,
  camposAlteradosDoEspaco,
  lerConfiguracaoDaHome,
  nomeDoBanner,
  nomeDoBannerNaTela,
  ordenarBanners,
  posicionarBanner,
  renumerarBanners,
  versaoRecusada,
  type BannerDaHome,
  type DadosDoBanner,
  type IdentificadorDoEspaco,
  type ImagemDoEspaco,
} from "../site/home.ts";

export const MENSAGEM_IMAGEM_DA_HOME_INDISPONIVEL = "A imagem escolhida não está mais na biblioteca (foi para a lixeira ou excluída). Envie ou escolha outra.";
export const MENSAGEM_IMAGEM_CELULAR_INDISPONIVEL = "A imagem da versão para celular não está mais na biblioteca (foi para a lixeira ou excluída). Envie ou escolha outra.";
export const MENSAGEM_IMAGEM_TABLET_INDISPONIVEL = "A imagem da versão para tablet não está mais na biblioteca (foi para a lixeira ou excluída). Envie ou escolha outra.";

type Falha = { ok: false; mensagem: string; campo?: "midiaId" | "midiaMobileId" | "midiaTabletId" };

// As duas versões: a nova (ou trocada) precisa existir e estar fora da
// lixeira; a já gravada pode ficar.
type Versoes = { midiaId: string | null; midiaMobileId: string | null; midiaTabletId?: string | null };
const MENSAGENS_DAS_VERSOES = { midiaId: MENSAGEM_IMAGEM_DA_HOME_INDISPONIVEL, midiaMobileId: MENSAGEM_IMAGEM_CELULAR_INDISPONIVEL, midiaTabletId: MENSAGEM_IMAGEM_TABLET_INDISPONIVEL };

async function conferirVersoes(db: Firestore, escolhidas: Versoes, anteriores: Versoes | null): Promise<Falha | null> {
  const campo = await versaoRecusada(escolhidas, anteriores, (id) => midiaPodeSerEscolhida(db, id));
  if (!campo) return null;
  return { ok: false, mensagem: MENSAGENS_DAS_VERSOES[campo], campo };
}

function referencia(db: Firestore) {
  return db.collection(COLECAO_DA_HOME).doc(DOCUMENTO_DA_HOME);
}

// A lista de banners é regravada inteira (ordem renumerada); campos
// opcionais vazios (versões celular e tablet, texto e botão) ficam de fora,
// como nos documentos anteriores a eles.
const OPCIONAIS_DO_BANNER = ["midiaMobileId", "midiaTabletId", "titulo", "trechoEmDestaque", "subtitulo", "textoDoBotao"] as const;
function paraGravar(banners: BannerDaHome[]): Record<string, unknown>[] {
  return banners.map((banner) => {
    const gravado: Record<string, unknown> = { ...banner };
    for (const campo of OPCIONAIS_DO_BANNER) if (!gravado[campo]) delete gravado[campo];
    // Fora da lixeira, sem o campo (como nos documentos anteriores a ela).
    if (!banner.excluidoEm) delete gravado.excluidoEm;
    // Posição do texto só quando há texto.
    if (!banner.titulo && !banner.subtitulo && !banner.textoDoBotao) delete gravado.posicaoDoTexto;
    return gravado;
  });
}

// Cria ou altera um banner (chave nova: cria) e o leva à posição pedida.
export async function salvarBanner(db: Firestore, dados: DadosDoBanner, autor: AutorDaAlteracao): Promise<{ ok: true; nome: string } | Falha> {
  return db.runTransaction(async (transacao) => {
    const documento = await transacao.get(referencia(db));
    const configuracao = lerConfiguracaoDaHome(documento.data());
    const antes = configuracao.banners.find((banner) => banner.chave === dados.chave) ?? null;
    // O limite conta também os banners da lixeira (ocupam lugar no documento).
    if (!antes && configuracao.banners.length >= LIMITE_DE_BANNERS) {
      return { ok: false, mensagem: `A home aceita no máximo ${LIMITE_DE_BANNERS} banners, contando os da lixeira. Exclua de vez um banner da lixeira para liberar lugar.` };
    }
    // Na lixeira, o banner só é salvo desativado: ativar exige restaurar antes.
    if (antes?.excluidoEm && dados.ativo) return { ok: false, mensagem: MENSAGENS_DA_LIXEIRA.naLixeira };
    const recusa = await conferirVersoes(db, dados, antes);
    if (recusa) return recusa;

    const novo: BannerDaHome = {
      chave: dados.chave,
      ordem: antes?.ordem ?? Number.MAX_SAFE_INTEGER,
      midiaId: dados.midiaId,
      midiaMobileId: dados.midiaId ? dados.midiaMobileId : null,
      midiaTabletId: dados.midiaId ? dados.midiaTabletId : null,
      alt: dados.midiaId ? dados.alt : "",
      href: dados.href,
      ativo: dados.ativo,
      pontoDeFoco: dados.pontoDeFoco,
      pontoDeFocoVertical: dados.pontoDeFocoVertical ?? "centro",
      titulo: dados.titulo,
      trechoEmDestaque: dados.trechoEmDestaque,
      subtitulo: dados.subtitulo,
      textoDoBotao: dados.href ? dados.textoDoBotao : "",
      posicaoDoTexto: dados.posicaoDoTexto,
      excluidoEm: antes?.excluidoEm ?? null,
    };
    const outros = configuracao.banners.filter((banner) => banner.chave !== dados.chave);
    const banners = posicionarBanner([...outros, novo], dados.chave, dados.posicao);
    const depois = banners.find((banner) => banner.chave === dados.chave) as BannerDaHome;
    const nome = nomeDoBanner(depois.ordem);
    const alterados = camposAlteradosDoBanner(antes, depois);

    transacao.set(referencia(db), { banners: paraGravar(banners), atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    registrarNaTransacao(db, transacao, autor, {
      colecao: COLECAO_DA_HOME,
      documentoId: DOCUMENTO_DA_HOME,
      acao: antes ? "editar" : "criar",
      campos: ["banners"],
      resumo: antes ? (alterados.length > 0 ? `${nome} alterado: ${alterados.join(", ")}.` : `${nome} salvo sem alterações.`) : `${nome} criado.`,
    });
    return { ok: true, nome };
  });
}

type ResultadoDoBanner = { ok: true; nome: string; mudou: boolean } | { ok: false; mensagem: string };

// Altera um banner da lista numa transação, com o registro. "alterar"
// devolve a lista nova e o resumo, ou uma recusa (sem gravar).
async function alterarBanner(
  db: Firestore,
  chave: string,
  autor: AutorDaAlteracao,
  acao: "editar" | "excluir" | "restaurar" | "excluir_definitivo",
  alterar: (banner: BannerDaHome, nome: string, ordenados: BannerDaHome[]) => { banners: BannerDaHome[]; resumo: string } | { recusa: string } | { semMudanca: true },
): Promise<ResultadoDoBanner> {
  return db.runTransaction(async (transacao) => {
    const documento = await transacao.get(referencia(db));
    const ordenados = ordenarBanners(lerConfiguracaoDaHome(documento.data()).banners);
    const posicao = ordenados.findIndex((banner) => banner.chave === chave);
    if (posicao < 0) return { ok: false as const, mensagem: "Banner não encontrado. Recarregue a página." };
    const banner = ordenados[posicao];
    const nome = nomeDoBannerNaTela(banner, posicao + 1);
    const resultado = alterar(banner, nome, ordenados);
    if ("recusa" in resultado) return { ok: false as const, mensagem: resultado.recusa };
    if ("semMudanca" in resultado) return { ok: true as const, nome, mudou: false };
    transacao.set(referencia(db), { banners: paraGravar(resultado.banners), atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    registrarNaTransacao(db, transacao, autor, { colecao: COLECAO_DA_HOME, documentoId: DOCUMENTO_DA_HOME, acao, campos: ["banners"], resumo: resultado.resumo });
    return { ok: true as const, nome, mudou: true };
  });
}

// Lista renumerada: os banners fora da lixeira primeiro, na ordem.
const reordenar = (banners: BannerDaHome[]) => renumerarBanners(ordenarBanners(banners));

// Ativa ou desativa sem abrir o formulário. Na lixeira, recusa.
export function mudarSituacaoDoBanner(db: Firestore, chave: string, ativo: boolean, autor: AutorDaAlteracao): Promise<ResultadoDoBanner> {
  return alterarBanner(db, chave, autor, "editar", (banner, _nome, ordenados) => {
    if (banner.excluidoEm) return { recusa: MENSAGENS_DA_LIXEIRA.naLixeira };
    if (banner.ativo === ativo) return { semMudanca: true };
    return { banners: ordenados.map((item) => (item.chave === chave ? { ...item, ativo } : item)), resumo: ativo ? "Banner ativado." : "Banner desativado." };
  });
}

// Lixeira (04/11/2026): o banner fica no documento, desativado e por último.
export function moverBannerParaLixeira(db: Firestore, chave: string, autor: AutorDaAlteracao): Promise<ResultadoDoBanner> {
  return alterarBanner(db, chave, autor, "excluir", (banner, _nome, ordenados) => {
    if (banner.excluidoEm) return { semMudanca: true };
    return { banners: reordenar(ordenados.map((item) => (item.chave === chave ? { ...item, ativo: false, excluidoEm: new Date() } : item))), resumo: "Banner movido para a lixeira." };
  });
}

// Restaurar: volta para o fim da lista, ainda desativado (ativar é outra ação).
export function restaurarBanner(db: Firestore, chave: string, autor: AutorDaAlteracao): Promise<ResultadoDoBanner> {
  return alterarBanner(db, chave, autor, "restaurar", (banner, _nome, ordenados) => {
    if (!banner.excluidoEm) return { semMudanca: true };
    const vivos = ordenados.filter((item) => !item.excluidoEm);
    const restaurado = { ...banner, excluidoEm: null, ordem: vivos.length + 0.5 };
    return { banners: reordenar(ordenados.map((item) => (item.chave === chave ? restaurado : item))), resumo: "Banner restaurado da lixeira." };
  });
}

// Excluir de vez: só da lixeira, com a confirmação reforçada (EXCLUIR ou o
// nome). A imagem continua na biblioteca.
export function excluirBannerDeVez(db: Firestore, chave: string, confirmacao: unknown, autor: AutorDaAlteracao): Promise<ResultadoDoBanner> {
  return alterarBanner(db, chave, autor, "excluir_definitivo", (banner, nome, ordenados) => {
    if (!banner.excluidoEm) return { recusa: MENSAGENS_DA_LIXEIRA.soDaLixeira };
    if (!confirmacaoDeExclusaoValida(confirmacao, nome)) return { recusa: MENSAGENS_DA_LIXEIRA.confirmacao };
    return { banners: reordenar(ordenados.filter((item) => item.chave !== chave)), resumo: "Banner excluído de vez." };
  });
}

// Imagem de um espaço fixo; sem imagem, o espaço volta ao padrão do site.
export async function salvarImagemDoEspaco(db: Firestore, identificador: IdentificadorDoEspaco, imagem: ImagemDoEspaco, autor: AutorDaAlteracao): Promise<{ ok: true; nome: string } | Falha> {
  const espaco = ESPACOS_DA_HOME.find((item) => item.identificador === identificador);
  if (!espaco) return { ok: false, mensagem: "Espaço de imagem não encontrado. Recarregue a página." };
  return db.runTransaction(async (transacao) => {
    const documento = await transacao.get(referencia(db));
    const antes = lerConfiguracaoDaHome(documento.data()).imagens[identificador] ?? null;
    const recusa = await conferirVersoes(db, imagem, antes);
    if (recusa) return recusa;
    // midiaMobileId sempre gravado (null sem versão celular): com merge, um
    // campo ausente manteria a versão celular anterior.
    const gravada: ImagemDoEspaco = { midiaId: imagem.midiaId, midiaMobileId: imagem.midiaId ? imagem.midiaMobileId : null, alt: imagem.alt };
    const alterados = camposAlteradosDoEspaco(antes, gravada);
    transacao.set(referencia(db), { imagens: { [identificador]: gravada }, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    registrarNaTransacao(db, transacao, autor, {
      colecao: COLECAO_DA_HOME,
      documentoId: DOCUMENTO_DA_HOME,
      acao: "editar",
      campos: [`imagens.${identificador}`],
      resumo: alterados.length > 0 ? `Imagem de "${espaco.nome}" alterada: ${alterados.join(", ")}.` : `Imagem de "${espaco.nome}" salva sem alterações.`,
    });
    return { ok: true, nome: espaco.nome };
  });
}
