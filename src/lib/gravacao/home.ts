// Gravação das imagens da home (29/10/2026) no documento configuracoes/home,
// com o registro em logAlteracoes na mesma transação. Sem server-only, como
// as outras gravações: o Firestore e o autor chegam por parâmetro e quem
// chama (acoes-home.ts) confere sessão e papel antes. O registro leva só os
// nomes do que mudou e o nome do espaço, nunca os valores.
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { registrarNaTransacao, type AutorDaAlteracao } from "../log/alteracoes.ts";
import { escolhaDeMidiaValida } from "../midia/biblioteca.ts";
import {
  COLECAO_DA_HOME,
  DOCUMENTO_DA_HOME,
  ESPACOS_DA_HOME,
  LIMITE_DE_BANNERS,
  camposAlteradosDoBanner,
  lerConfiguracaoDaHome,
  nomeDoBanner,
  ordenarBanners,
  posicionarBanner,
  type BannerDaHome,
  type DadosDoBanner,
  type IdentificadorDoEspaco,
  type ImagemDoEspaco,
} from "../site/home.ts";

export const MENSAGEM_IMAGEM_DA_HOME_INDISPONIVEL = "A imagem escolhida não está mais na biblioteca (foi para a lixeira ou excluída). Envie ou escolha outra.";

type Falha = { ok: false; mensagem: string; campo?: "midiaId" };

function referencia(db: Firestore) {
  return db.collection(COLECAO_DA_HOME).doc(DOCUMENTO_DA_HOME);
}

// Cria ou altera um banner (chave nova: cria) e o leva à posição pedida.
export async function salvarBanner(db: Firestore, dados: DadosDoBanner, autor: AutorDaAlteracao): Promise<{ ok: true; nome: string } | Falha> {
  return db.runTransaction(async (transacao) => {
    const documento = await transacao.get(referencia(db));
    const configuracao = lerConfiguracaoDaHome(documento.data());
    const antes = configuracao.banners.find((banner) => banner.chave === dados.chave) ?? null;
    if (!antes && configuracao.banners.length >= LIMITE_DE_BANNERS) return { ok: false, mensagem: `A home aceita no máximo ${LIMITE_DE_BANNERS} banners.` };
    if (!(await escolhaDeMidiaValida(db, dados.midiaId, antes?.midiaId ?? null))) return { ok: false, mensagem: MENSAGEM_IMAGEM_DA_HOME_INDISPONIVEL, campo: "midiaId" };

    const novo: BannerDaHome = { chave: dados.chave, ordem: antes?.ordem ?? Number.MAX_SAFE_INTEGER, midiaId: dados.midiaId, alt: dados.midiaId ? dados.alt : "", href: dados.href, ativo: dados.ativo };
    const outros = configuracao.banners.filter((banner) => banner.chave !== dados.chave);
    const banners = posicionarBanner([...outros, novo], dados.chave, dados.posicao);
    const depois = banners.find((banner) => banner.chave === dados.chave) as BannerDaHome;
    const nome = nomeDoBanner(depois.ordem);
    const alterados = camposAlteradosDoBanner(antes, depois);

    transacao.set(referencia(db), { banners, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
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

export async function excluirBanner(db: Firestore, chave: string, autor: AutorDaAlteracao): Promise<{ ok: true; nome: string } | Falha> {
  return db.runTransaction(async (transacao) => {
    const documento = await transacao.get(referencia(db));
    const ordenados = ordenarBanners(lerConfiguracaoDaHome(documento.data()).banners);
    const posicao = ordenados.findIndex((banner) => banner.chave === chave);
    if (posicao < 0) return { ok: false, mensagem: "Banner não encontrado. Recarregue a página." };
    const banners = ordenados.filter((banner) => banner.chave !== chave).map((banner, indice) => ({ ...banner, ordem: indice + 1 }));
    const nome = nomeDoBanner(posicao + 1);
    transacao.set(referencia(db), { banners, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    registrarNaTransacao(db, transacao, autor, { colecao: COLECAO_DA_HOME, documentoId: DOCUMENTO_DA_HOME, acao: "excluir", campos: ["banners"], resumo: `${nome} excluído.` });
    return { ok: true, nome };
  });
}

// Imagem de um espaço fixo; sem imagem, o espaço volta ao padrão do site.
export async function salvarImagemDoEspaco(db: Firestore, identificador: IdentificadorDoEspaco, imagem: ImagemDoEspaco, autor: AutorDaAlteracao): Promise<{ ok: true; nome: string } | Falha> {
  const espaco = ESPACOS_DA_HOME.find((item) => item.identificador === identificador);
  if (!espaco) return { ok: false, mensagem: "Espaço de imagem não encontrado. Recarregue a página." };
  return db.runTransaction(async (transacao) => {
    const documento = await transacao.get(referencia(db));
    const antes = lerConfiguracaoDaHome(documento.data()).imagens[identificador] ?? null;
    if (!(await escolhaDeMidiaValida(db, imagem.midiaId, antes?.midiaId ?? null))) return { ok: false, mensagem: MENSAGEM_IMAGEM_DA_HOME_INDISPONIVEL, campo: "midiaId" };
    const alterados = [...((antes?.midiaId ?? null) !== imagem.midiaId ? ["imagem"] : []), ...((antes?.alt ?? "") !== imagem.alt ? ["texto alternativo"] : [])];
    transacao.set(referencia(db), { imagens: { [identificador]: imagem }, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
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
