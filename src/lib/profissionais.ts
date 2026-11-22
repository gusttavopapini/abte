// Validação do cadastro de profissional (painel). Função pura: lê o FormData,
// devolve os dados prontos para gravar ou os erros de cada campo, em português.
// Usada pela ação de servidor e pelos testes de unidade.
import { METODOS, PAISES, TAGS_DE_PROFISSIONAIS, UFS, type CodigoDePais, type TipoDeProfissional } from "../config/profissionais.ts";
import {
  validarEmailDeContato,
  validarEmailsExtras,
  validarFacebook,
  validarInstagram,
  validarOutrosPerfis,
  validarSite,
  validarTelefones,
  validarWhatsapp,
  type PerfilExtra,
  type ResultadoDoContato,
} from "./contatos.ts";
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
  // Telefones fixos ou celulares (06/11/2026): só os dígitos, com o código do
  // país, até 3. Lista vazia sem telefone.
  telefones: string[];
  instagram: string;
  facebook: string;
  email: string;
  // Campos extras (08/11/2026), todos opcionais: endereço do consultório
  // (texto), site (link http(s)), outros perfis (rótulo e link) e e-mails
  // extras. Vazios: "" ou lista vazia.
  endereco: string;
  site: string;
  outrosPerfis: PerfilExtra[];
  emailsExtras: string[];
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

// Tags do profissional (21/11/2026): texto livre digitado no painel, gravado
// no campo metodos (o card e o popup mostram as etiquetas). Espaços extras
// saem; repetidas (sem diferença de maiúsculas) contam uma vez; um método da
// lista METODOS volta com a grafia oficial (mantém a cor da etiqueta).
export const LIMITES_DAS_TAGS = { quantidade: 15, tamanho: 40 } as const;

export function normalizarTag(valor: string): string {
  const limpa = valor.replace(/\s+/g, " ").trim();
  const oficial = METODOS.find((metodo) => metodo.toLocaleLowerCase("pt-BR") === limpa.toLocaleLowerCase("pt-BR"));
  return oficial ?? limpa;
}

export function lerTagsDoProfissional(valores: unknown[]): { ok: true; tags: string[] } | { ok: false; erro: string } {
  const tags: string[] = [];
  const vistas = new Set<string>();
  for (const valor of valores) {
    if (typeof valor !== "string") continue;
    const tag = normalizarTag(valor);
    if (!tag) continue;
    if (tag.length > LIMITES_DAS_TAGS.tamanho) return { ok: false, erro: `Cada tag pode ter no máximo ${LIMITES_DAS_TAGS.tamanho} caracteres.` };
    const chave = tag.toLocaleLowerCase("pt-BR");
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    tags.push(tag);
  }
  if (tags.length > LIMITES_DAS_TAGS.quantidade) return { ok: false, erro: `Use no máximo ${LIMITES_DAS_TAGS.quantidade} tags.` };
  return { ok: true, tags };
}

// Apresentação até 3.000 caracteres desde 08/11/2026 (antes, 1.000).
export const LIMITES_DO_PROFISSIONAL = { tratamento: 20, nome: 120, registro: 60, cidade: 60, cidades: 10, bio: 3000, contato: 300, endereco: 200 } as const;
const LIMITES = LIMITES_DO_PROFISSIONAL;
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

  const tagsLidas = lerTagsDoProfissional(dados.getAll("metodos"));
  if (!tagsLidas.ok) erros.metodos = tagsLidas.erro;
  const metodos = tagsLidas.ok ? tagsLidas.tags : [];

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
  const telefones = validarTelefones(texto(dados, "telefones").slice(0, LIMITES.contato), paisValido ? (pais as CodigoDePais) : "BR");
  if (!telefones.ok) erros.telefones = telefones.erro;
  if (telefones.ok && telefones.valor.length === 0 && Object.values(contatos).every((resultado) => resultado.ok && !resultado.valor)) {
    erros.contatos = "Informe pelo menos um contato: WhatsApp, telefone, Instagram, Facebook ou e-mail.";
  }

  const endereco = texto(dados, "endereco").replace(/\s+/g, " ");
  if (endereco.length > LIMITES.endereco) erros.endereco = `O endereço aceita no máximo ${LIMITES.endereco} caracteres.`;
  const site = validarSite(texto(dados, "site").slice(0, LIMITES.contato + 1));
  if (!site.ok) erros.site = site.erro;
  const outrosPerfis = validarOutrosPerfis(texto(dados, "outrosPerfis").slice(0, 2000));
  if (!outrosPerfis.ok) erros.outrosPerfis = outrosPerfis.erro;
  const emailsExtras = validarEmailsExtras(texto(dados, "emailsExtras").slice(0, 1000));
  if (!emailsExtras.ok) erros.emailsExtras = emailsExtras.erro;

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
      metodos,
      pais: pais as CodigoDePais,
      uf,
      cidades,
      telerreabilitacao,
      whatsapp: valores.whatsapp,
      telefones: telefones.ok ? telefones.valor : [],
      instagram: valores.instagram,
      facebook: valores.facebook,
      email: valores.email,
      endereco,
      site: site.ok ? site.valor : "",
      outrosPerfis: outrosPerfis.ok ? outrosPerfis.valor : [],
      emailsExtras: emailsExtras.ok ? emailsExtras.valor : [],
      bio,
      ativo: marcado(dados, "ativo"),
      ordem,
      fotoMidiaId,
    },
  };
}
