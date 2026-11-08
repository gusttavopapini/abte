// Mensagens do formulário de contato (08/11/2026): validação pura, usada no
// navegador (ajuda imediata) e de novo no servidor (a que vale), antes de
// gravar em mensagensDeContato. Sem Firebase: também roda nos testes.
import { ehEmailValido } from "./validacao.ts";

export const COLECAO_DE_MENSAGENS = "mensagensDeContato";

export const LIMITES_DO_CONTATO = {
  nome: 80,
  sobrenome: 80,
  email: 254,
  assunto: 150,
  mensagem: 5000,
} as const;

// Envio repetido: o mesmo e-mail só envia de novo depois deste intervalo.
export const INTERVALO_ENTRE_ENVIOS_MS = 60 * 1000;

export type CampoDoContato = "nome" | "sobrenome" | "email" | "assunto" | "mensagem" | "consentimento";
export type ErrosDoContato = Partial<Record<CampoDoContato, string>>;

export type MensagemDeContatoValida = {
  nome: string;
  sobrenome: string;
  email: string;
  assunto: string;
  mensagem: string;
  consentimento: true;
};

// Ordem dos campos no formulário: o foco vai para o primeiro com erro.
export const ORDEM_DOS_CAMPOS_DO_CONTATO: CampoDoContato[] = ["nome", "sobrenome", "email", "assunto", "mensagem", "consentimento"];

// Texto de uma linha: sem espaços nas pontas e com os espaços internos
// reduzidos a um; sem caracteres de controle.
function linha(valor: unknown): string {
  return typeof valor === "string" ? valor.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : "";
}

// Texto da mensagem: mantém as quebras de linha (no máximo uma linha em
// branco seguida) e tira os outros caracteres de controle.
function textoLongo(valor: unknown): string {
  if (typeof valor !== "string") return "";
  return valor
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .split("\n")
    .map((parte) => parte.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Consentimento: só o valor "sim" do formulário (ou true) vale.
function consentiu(valor: unknown): boolean {
  return valor === true || valor === "sim" || valor === "on";
}

export function validarMensagemDeContato(campos: {
  nome: unknown;
  sobrenome: unknown;
  email: unknown;
  assunto: unknown;
  mensagem: unknown;
  consentimento: unknown;
}): { ok: true; dados: MensagemDeContatoValida } | { ok: false; erros: ErrosDoContato } {
  const nome = linha(campos.nome);
  const sobrenome = linha(campos.sobrenome);
  const email = linha(campos.email).toLowerCase();
  const assunto = linha(campos.assunto);
  const mensagem = textoLongo(campos.mensagem);
  const erros: ErrosDoContato = {};
  if (!nome) erros.nome = "Informe seu nome.";
  else if (nome.length > LIMITES_DO_CONTATO.nome) erros.nome = `O nome aceita no máximo ${LIMITES_DO_CONTATO.nome} caracteres.`;
  if (!sobrenome) erros.sobrenome = "Informe seu sobrenome.";
  else if (sobrenome.length > LIMITES_DO_CONTATO.sobrenome) erros.sobrenome = `O sobrenome aceita no máximo ${LIMITES_DO_CONTATO.sobrenome} caracteres.`;
  if (!email) erros.email = "Informe seu e-mail.";
  else if (email.length > LIMITES_DO_CONTATO.email || !ehEmailValido(email)) erros.email = "Informe um e-mail válido, como nome@exemplo.com.";
  if (assunto.length > LIMITES_DO_CONTATO.assunto) erros.assunto = `O assunto aceita no máximo ${LIMITES_DO_CONTATO.assunto} caracteres.`;
  if (!mensagem) erros.mensagem = "Escreva sua mensagem.";
  else if (mensagem.length > LIMITES_DO_CONTATO.mensagem) erros.mensagem = `A mensagem aceita no máximo ${LIMITES_DO_CONTATO.mensagem} caracteres.`;
  if (!consentiu(campos.consentimento)) erros.consentimento = "Para enviar, marque que você leu e concorda com a Política de Privacidade.";
  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return { ok: true, dados: { nome, sobrenome, email, assunto, mensagem, consentimento: true } };
}

// Já houve envio do mesmo e-mail há menos do intervalo? (datas em ms)
export function envioMuitoRecente(enviosAnteriores: number[], agora: number): boolean {
  return enviosAnteriores.some((momento) => Number.isFinite(momento) && agora - momento >= 0 && agora - momento < INTERVALO_ENTRE_ENVIOS_MS);
}

// Respostas da ação do formulário, em português.
export const MENSAGEM_ENVIADA = "Mensagem enviada. Obrigado por falar com a ABTE.";
export const MENSAGEM_REPETIDA = "Recebemos uma mensagem deste e-mail há menos de um minuto. Aguarde um pouco antes de enviar de novo.";
export const MENSAGEM_CONFIRA = "Confira os campos marcados.";
export const MENSAGEM_FALHA = "Não foi possível enviar sua mensagem agora. Tente de novo em alguns minutos ou use os canais de contato do rodapé.";

// Data e hora da mensagem no painel, no horário de Brasília ("08/11/2026,
// 09:12"); sem data, "data desconhecida".
export function dataHoraDaMensagem(iso: string | null): string {
  if (!iso) return "data desconhecida";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "data desconhecida";
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
