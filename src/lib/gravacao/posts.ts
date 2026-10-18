// Gravação dos posts do blog no Firestore. Sem sessão e sem "server-only",
// como gravacao/profissionais.ts: recebe o Firestore por parâmetro e é usada
// pelas ações de servidor (acoes-conteudo.ts, que conferem sessão e papel
// antes) e pelos testes no emulador. Ainda sem registro de alterações (fica
// para a etapa 3).
import type { Firestore } from "firebase-admin/firestore";
import { escolhaDeMidiaValida } from "../midia/biblioteca.ts";

export const COLECAO_POSTS = "posts";

export const MENSAGEM_CAPA_INDISPONIVEL = "A capa escolhida não está mais na biblioteca (foi para a lixeira ou excluída). Escolha outra ou remova a capa.";

export type DadosDoPost = {
  titulo: string;
  conteudo: string;
  status: "publicado" | "rascunho";
  slug: string;
  capaMidiaId: string | null;
};

type Falha = { ok: false; mensagem: string; campo?: "capaMidiaId" };

// Cria (id null) ou atualiza um post. O campo antigo "imagem" (endereço de
// capa digitado) nunca é gravado nem apagado aqui: o valor que já existe fica
// como está e só aparece no site enquanto o post não tiver capaMidiaId.
export async function gravarPost(db: Firestore, id: string | null, dados: DadosDoPost): Promise<{ ok: true; id: string } | Falha> {
  const colecao = db.collection(COLECAO_POSTS);
  const referencia = id ? colecao.doc(id) : colecao.doc();
  const atual = id ? await referencia.get() : null;
  if (atual && !atual.exists) return { ok: false, mensagem: "Post não encontrado." };

  if (!(await escolhaDeMidiaValida(db, dados.capaMidiaId, atual?.get("capaMidiaId") ?? null))) {
    return { ok: false, mensagem: MENSAGEM_CAPA_INDISPONIVEL, campo: "capaMidiaId" };
  }

  const agora = new Date();
  if (atual) await referencia.update({ ...dados, atualizadoEm: agora });
  else await referencia.create({ ...dados, criadoEm: agora, atualizadoEm: agora });
  return { ok: true, id: referencia.id };
}
