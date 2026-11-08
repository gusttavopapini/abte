"use server";

// Ação pública do formulário "Fale com a ABTE" (08/11/2026). Valida de novo
// no servidor (a validação do navegador é só ajuda) e grava em
// mensagensDeContato pelo Admin SDK; o sucesso só volta depois de gravar.
// Sem sessão: qualquer visitante envia. Contra envio repetido, o mesmo
// e-mail espera um minuto (conferido no Firestore, na gravação).
// E-mail automático para a ABTE: fica para depois.
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { MENSAGEM_CONFIRA, MENSAGEM_ENVIADA, MENSAGEM_FALHA, MENSAGEM_REPETIDA, validarMensagemDeContato, type ErrosDoContato } from "@/lib/contato";
import { gravarMensagemDeContato } from "@/lib/gravacao/contato";

export type RespostaDoContato = { ok: boolean; mensagem: string; erros?: ErrosDoContato };

export async function enviarMensagemDeContato(campos: { nome: string; sobrenome: string; email: string; assunto: string; mensagem: string; consentimento: boolean }): Promise<RespostaDoContato> {
  const entrada = campos && typeof campos === "object" ? campos : ({} as Record<string, unknown>);
  const lido = validarMensagemDeContato({
    nome: entrada.nome,
    sobrenome: entrada.sobrenome,
    email: entrada.email,
    assunto: entrada.assunto,
    mensagem: entrada.mensagem,
    consentimento: entrada.consentimento,
  });
  if (!lido.ok) return { ok: false, mensagem: MENSAGEM_CONFIRA, erros: lido.erros };
  try {
    const gravado = await gravarMensagemDeContato(firestoreAdmin(), lido.dados);
    if (!gravado.ok) return { ok: false, mensagem: MENSAGEM_REPETIDA };
    return { ok: true, mensagem: MENSAGEM_ENVIADA };
  } catch (erro) {
    console.error("Contato: falha ao gravar a mensagem.", erro);
    return { ok: false, mensagem: MENSAGEM_FALHA };
  }
}
