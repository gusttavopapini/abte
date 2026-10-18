// Validação do cadastro de profissional (painel). Função pura: lê o FormData,
// devolve os dados prontos para gravar ou os erros de cada campo, em português.
// Usada pela ação de servidor e pelos testes de unidade.
import { METODOS, PAISES, TAGS_DE_PROFISSIONAIS, UFS, type CodigoDePais, type TipoDeProfissional } from "../config/profissionais.ts";
import { validarEmailDeContato, validarFacebook, validarInstagram, validarWhatsapp, type ResultadoDoContato } from "./contatos.ts";
import { ehIdDeDocumentoValido } from "./validacao.ts";

export type DadosDoProfissional = {
  tipo: TipoDeProfissional;
  tratamento: string;
  nome: string;
  registro: string;
  metodos: string[];
  pais: CodigoDePais;
  uf: string;
  cidades: string[];
  telerreabilitacao: boolean;
  whatsapp: string;
  instagram: string;
  facebook: string;
  email: string;
  bio: string;
  ativo: boolean;
  ordem: number;
  // Id de uma imagem da biblioteca de mídia, ou null sem foto. Se a imagem
  // existe e está fora da lixeira é conferido na gravação (Firestore).
  fotoMidiaId: string | null;
};

export type CampoDoProfissional = keyof DadosDoProfissional | "contatos" | "local";

export type ResultadoDoProfissional =
  | { ok: true; dados: DadosDoProfissional }
  | { ok: false; erros: Partial<Record<CampoDoProfissional, string>> };

const LIMITES = { tratamento: 20, nome: 120, registro: 60, cidade: 60, cidades: 10, bio: 1000, contato: 300 } as const;
const ORDEM_MAXIMA = 999;

function texto(dados: FormData, campo: string): string {
  const valor = dados.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function marcado(dados: FormData, campo: string): boolean {
  return dados.get(campo) === "sim";
}

export function validarProfissional(dados: FormData): ResultadoDoProfissional {
  const erros: Partial<Record<CampoDoProfissional, string>> = {};

  const tipo = texto(dados, "tipo");
  if (!(TAGS_DE_PROFISSIONAIS as readonly string[]).includes(tipo)) erros.tipo = "Escolha o tipo de profissional.";

  const tratamento = texto(dados, "tratamento");
  if (tratamento.length > LIMITES.tratamento) erros.tratamento = `Use no máximo ${LIMITES.tratamento} caracteres (ex.: Dra., Dr., Ft.).`;

  const nome = texto(dados, "nome");
  if (!nome) erros.nome = "Preencha o nome.";
  else if (nome.length > LIMITES.nome) erros.nome = `Use no máximo ${LIMITES.nome} caracteres.`;

  const registro = texto(dados, "registro");
  if (registro.length > LIMITES.registro) erros.registro = `Use no máximo ${LIMITES.registro} caracteres.`;

  const metodos = [...new Set(dados.getAll("metodos").filter((valor): valor is string => typeof valor === "string"))];
  if (metodos.some((metodo) => !(METODOS as readonly string[]).includes(metodo))) erros.metodos = "Método desconhecido.";

  const pais = texto(dados, "pais");
  const paisValido = PAISES.some((item) => item.codigo === pais);
  if (!paisValido) erros.pais = "Escolha o país.";

  // UF só para o Brasil; nos outros países fica vazia.
  let uf = texto(dados, "uf").toUpperCase();
  if (pais === "BR") {
    if (!(UFS as readonly string[]).includes(uf)) erros.uf = "Escolha a UF.";
  } else {
    uf = "";
  }

  // Cidades separadas por vírgula, ponto e vírgula ou linha.
  const cidades = [...new Set(texto(dados, "cidades").split(/[,;\n]/).map((cidade) => cidade.trim()).filter(Boolean))];
  if (cidades.length > LIMITES.cidades) erros.cidades = `Informe no máximo ${LIMITES.cidades} cidades.`;
  else if (cidades.some((cidade) => cidade.length > LIMITES.cidade)) erros.cidades = `Cada cidade aceita no máximo ${LIMITES.cidade} caracteres.`;

  const telerreabilitacao = marcado(dados, "telerreabilitacao");
  if (cidades.length === 0 && !telerreabilitacao && !erros.cidades) {
    erros.local = "Informe pelo menos uma cidade ou marque telerreabilitação.";
  }

  // Contatos: cada campo tem a própria validação; pelo menos um é obrigatório.
  const contatos: Record<"whatsapp" | "instagram" | "facebook" | "email", ResultadoDoContato> = {
    whatsapp: validarWhatsapp(texto(dados, "whatsapp").slice(0, LIMITES.contato), paisValido ? (pais as CodigoDePais) : "BR"),
    instagram: validarInstagram(texto(dados, "instagram").slice(0, LIMITES.contato)),
    facebook: validarFacebook(texto(dados, "facebook").slice(0, LIMITES.contato)),
    email: validarEmailDeContato(texto(dados, "email").slice(0, LIMITES.contato)),
  };
  for (const [campo, resultado] of Object.entries(contatos)) {
    if (!resultado.ok) erros[campo as keyof typeof contatos] = resultado.erro;
  }
  const valores = Object.fromEntries(Object.entries(contatos).map(([campo, resultado]) => [campo, resultado.ok ? resultado.valor : ""]));
  if (Object.values(contatos).every((resultado) => resultado.ok && !resultado.valor)) {
    erros.contatos = "Informe pelo menos um contato: WhatsApp, Instagram, Facebook ou e-mail.";
  }

  const bio = texto(dados, "bio");
  if (bio.length > LIMITES.bio) erros.bio = `A apresentação aceita no máximo ${LIMITES.bio} caracteres.`;

  const ordemTexto = texto(dados, "ordem");
  const ordem = ordemTexto === "" ? 0 : Number(ordemTexto);
  if (!/^\d*$/.test(ordemTexto) || ordem > ORDEM_MAXIMA) erros.ordem = `Use um número inteiro de 0 a ${ORDEM_MAXIMA}.`;

  const fotoMidiaId = texto(dados, "fotoMidiaId") || null;
  if (fotoMidiaId !== null && !ehIdDeDocumentoValido(fotoMidiaId)) erros.fotoMidiaId = "Foto inválida. Escolha a foto de novo.";

  if (Object.keys(erros).length > 0) return { ok: false, erros };

  return {
    ok: true,
    dados: {
      tipo: tipo as TipoDeProfissional,
      tratamento,
      nome,
      registro,
      metodos: METODOS.filter((metodo) => metodos.includes(metodo)),
      pais: pais as CodigoDePais,
      uf,
      cidades,
      telerreabilitacao,
      whatsapp: valores.whatsapp,
      instagram: valores.instagram,
      facebook: valores.facebook,
      email: valores.email,
      bio,
      ativo: marcado(dados, "ativo"),
      ordem,
      fotoMidiaId,
    },
  };
}
