// Validação do cadastro de cliente da loja. Função pura, com mensagens em
// português, usada pela ação de servidor e pelos testes de unidade.
// Dados mínimos: nome, e-mail e senha (a senha fica só no Firebase
// Authentication, nunca no Firestore), mais o consentimento.
import { ehEmailValido } from "../validacao.ts";

export type DadosDoCadastro = { nome: string; email: string; senha: string };
export type CampoDoCadastro = "nome" | "email" | "senha" | "confirmacao" | "consentimento";

export type ResultadoDoCadastro =
  | { ok: true; dados: DadosDoCadastro }
  | { ok: false; erros: Partial<Record<CampoDoCadastro, string>>; robo?: true };

export const SENHA_MINIMA = 8;
const SENHA_MAXIMA = 128;
const NOME_MAXIMO = 80;
const EMAIL_MAXIMO = 254;

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === "string" ? valor : "";
}

export function validarCadastroDeCliente(dados: FormData): ResultadoDoCadastro {
  // Campo escondido de pessoas: se vier preenchido, quase sempre é um robô.
  if (texto(dados, "site")) return { ok: false, erros: {}, robo: true };

  const erros: Partial<Record<CampoDoCadastro, string>> = {};
  const nome = texto(dados, "nome").trim();
  if (!nome) erros.nome = "Informe seu nome.";
  else if (nome.length > NOME_MAXIMO) erros.nome = `Use no máximo ${NOME_MAXIMO} caracteres.`;

  const email = texto(dados, "email").trim().toLowerCase();
  if (!email) erros.email = "Informe seu e-mail.";
  else if (email.length > EMAIL_MAXIMO || !ehEmailValido(email)) erros.email = "Informe um e-mail válido, como nome@exemplo.com.";

  const senha = texto(dados, "senha");
  if (senha.length < SENHA_MINIMA) erros.senha = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  else if (senha.length > SENHA_MAXIMA) erros.senha = `A senha aceita no máximo ${SENHA_MAXIMA} caracteres.`;
  if (texto(dados, "confirmacao") !== senha) erros.confirmacao = "As duas senhas não são iguais.";

  if (dados.get("consentimento") !== "sim") {
    erros.consentimento = "Para criar a conta, é preciso concordar com o uso dos seus dados descrito acima.";
  }

  if (Object.keys(erros).length > 0) return { ok: false, erros };
  return { ok: true, dados: { nome, email, senha } };
}
