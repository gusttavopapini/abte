// Configurações do site (30/10/2026): documento único configuracoes/site,
// editado em /admin/configuracoes (só administrador). Puro (sem Firebase):
// usado pelo layout público, pelas páginas, pela gravação e pelos testes.
// Sem o documento, com um campo ausente ou se a leitura falhar, vale o
// padrão, que é o comportamento de antes (Artigos no site).
import type { ItemDoMenu, LinkDeNavegacao } from "../../config/navegacao.ts";
import { ehEmailValido } from "../validacao.ts";

export const COLECAO_DE_CONFIGURACOES = "configuracoes";
export const DOCUMENTO_DO_SITE = "site";
// Etiqueta do cache da leitura (lib/dados/site.ts), revalidada ao salvar.
export const ETIQUETA_DO_SITE = "configuracoes-site";

// Pix ESTÁTICO (30/10/2026): só a chave para o doador copiar, sem QR Code,
// sem gateway e sem registro de doações. A chave é preenchida pelo
// administrador no painel; nada de chave no código.
export const TIPOS_DE_CHAVE_PIX = ["cnpj", "email", "telefone", "aleatoria"] as const;
export type TipoDeChavePix = (typeof TIPOS_DE_CHAVE_PIX)[number];
export const ROTULOS_DOS_TIPOS_DE_CHAVE: Record<TipoDeChavePix, string> = { cnpj: "CNPJ", email: "E-mail", telefone: "Telefone", aleatoria: "Chave aleatória" };
export const LIMITE_DO_FAVORECIDO = 100;
export const LIMITE_DA_ORIENTACAO = 300;
const LIMITE_DA_CHAVE_DE_EMAIL = 77;

export type ChavePix = { tipo: TipoDeChavePix; chave: string; favorecido: string; orientacao: string };

export type ConfiguracaoDoSite = {
  // Artigos no site (menu, rodapé, /artigos e links para lá). Ausente: true.
  artigosAtivo: boolean;
  // Pix da página /doe; null: a página mostra o texto provisório de antes.
  pix: ChavePix | null;
};

export const CONFIGURACAO_PADRAO_DO_SITE: ConfiguracaoDoSite = { artigosAtivo: true, pix: null };

function ehTipoDeChavePix(valor: unknown): valor is TipoDeChavePix {
  return typeof valor === "string" && (TIPOS_DE_CHAVE_PIX as readonly string[]).includes(valor);
}

function texto(valor: unknown, limite: number): string {
  return typeof valor === "string" ? valor.trim().replace(/\s+/g, " ").slice(0, limite) : "";
}

// Confere a chave pelo tipo e devolve a forma gravada (CNPJ só com os
// dígitos; telefone no formato do Pix, +55 com DDD; e-mail em minúsculas;
// chave aleatória no formato do Banco Central, 32 dígitos hexadecimais com
// hífens).
export function validarChavePix(tipo: TipoDeChavePix, entrada: string): { ok: true; chave: string } | { ok: false; mensagem: string } {
  const valor = entrada.trim();
  if (!valor) return { ok: false, mensagem: "Preencha a chave Pix." };
  if (tipo === "cnpj") {
    const digitos = valor.replace(/[.\-/\s]/g, "");
    return /^\d{14}$/.test(digitos) ? { ok: true, chave: digitos } : { ok: false, mensagem: "O CNPJ precisa ter 14 números (pontos, barra e hífen são opcionais)." };
  }
  if (tipo === "email") {
    const email = valor.toLowerCase();
    if (email.length > LIMITE_DA_CHAVE_DE_EMAIL) return { ok: false, mensagem: `A chave de e-mail aceita no máximo ${LIMITE_DA_CHAVE_DE_EMAIL} caracteres.` };
    return ehEmailValido(email) ? { ok: true, chave: email } : { ok: false, mensagem: "Escreva um e-mail válido, como nome@dominio.com.br." };
  }
  if (tipo === "telefone") {
    const digitos = valor.replace(/[\s()+\-.]/g, "");
    if (!/^\d+$/.test(digitos)) return { ok: false, mensagem: "O telefone aceita só números, com DDD (ex.: 11 91234 5678)." };
    const nacional = digitos.length >= 12 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
    return /^\d{10,11}$/.test(nacional) ? { ok: true, chave: `+55${nacional}` } : { ok: false, mensagem: "O telefone precisa ter DDD e número (10 ou 11 números, sem o +55)." };
  }
  const aleatoria = valor.toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(aleatoria)
    ? { ok: true, chave: aleatoria }
    : { ok: false, mensagem: "A chave aleatória tem 36 caracteres, com letras, números e hífens (ex.: 1a2b3c4d-...)." };
}

function lerPix(valor: unknown): ChavePix | null {
  if (!valor || typeof valor !== "object") return null;
  const campos = valor as Record<string, unknown>;
  if (!ehTipoDeChavePix(campos.tipo) || typeof campos.chave !== "string") return null;
  const chave = validarChavePix(campos.tipo, campos.chave);
  if (!chave.ok) return null;
  return { tipo: campos.tipo, chave: chave.chave, favorecido: texto(campos.favorecido, LIMITE_DO_FAVORECIDO), orientacao: texto(campos.orientacao, LIMITE_DA_ORIENTACAO) };
}

// Leitura tolerante: o que não tiver a forma esperada vale o padrão.
export function lerConfiguracaoDoSite(dados: unknown): ConfiguracaoDoSite {
  const campos = dados && typeof dados === "object" ? (dados as Record<string, unknown>) : {};
  return { artigosAtivo: campos.artigosAtivo !== false, pix: lerPix(campos.pix) };
}

// Formulário da caixa "Doações por Pix". Chave vazia: sem Pix (a página
// volta ao texto provisório). Erros por campo, em português.
export type CampoDoPix = "tipo" | "chave" | "favorecido" | "orientacao";
export function lerPixDoFormulario(campos: { tipo: unknown; chave: unknown; favorecido: unknown; orientacao: unknown }):
  | { ok: true; pix: ChavePix | null }
  | { ok: false; erros: Partial<Record<CampoDoPix, string>>; mensagem: string } {
  const entrada = typeof campos.chave === "string" ? campos.chave : "";
  const favorecido = typeof campos.favorecido === "string" ? campos.favorecido.trim().replace(/\s+/g, " ") : "";
  const orientacao = typeof campos.orientacao === "string" ? campos.orientacao.trim().replace(/\s+/g, " ") : "";
  if (!entrada.trim()) return { ok: true, pix: null };
  const erros: Partial<Record<CampoDoPix, string>> = {};
  if (!ehTipoDeChavePix(campos.tipo)) erros.tipo = "Escolha o tipo da chave.";
  const chave = ehTipoDeChavePix(campos.tipo) ? validarChavePix(campos.tipo, entrada) : null;
  if (chave && !chave.ok) erros.chave = chave.mensagem;
  if (favorecido.length > LIMITE_DO_FAVORECIDO) erros.favorecido = `O nome do favorecido aceita no máximo ${LIMITE_DO_FAVORECIDO} caracteres.`;
  if (orientacao.length > LIMITE_DA_ORIENTACAO) erros.orientacao = `A orientação aceita no máximo ${LIMITE_DA_ORIENTACAO} caracteres.`;
  if (Object.keys(erros).length > 0 || !chave?.ok) return { ok: false, erros, mensagem: "Confira os campos marcados." };
  return { ok: true, pix: { tipo: campos.tipo as TipoDeChavePix, chave: chave.chave, favorecido, orientacao } };
}

// Nomes (sem valores) do que mudou no Pix, para o registro de alterações.
export function camposAlteradosDoPix(antes: ChavePix | null, depois: ChavePix | null): string[] {
  if (!antes && !depois) return [];
  if (!depois) return ["chave Pix removida"];
  const alterados: string[] = [];
  if (!antes || antes.tipo !== depois.tipo || antes.chave !== depois.chave) alterados.push("chave Pix alterada");
  if ((antes?.favorecido ?? "") !== depois.favorecido) alterados.push("favorecido");
  if ((antes?.orientacao ?? "") !== depois.orientacao) alterados.push("orientação");
  return alterados;
}

// O caminho leva aos Artigos públicos? (/artigos, /artigos/..., com ou sem
// busca ou âncora; o painel /admin/artigos não conta)
export function ehCaminhoDosArtigos(href: string): boolean {
  return /^\/artigos(?:[/?#]|$)/.test(href);
}

// Um link interno pode aparecer no site com esta configuração?
export function linkDisponivel(href: string, configuracao: ConfiguracaoDoSite): boolean {
  return configuracao.artigosAtivo || !ehCaminhoDosArtigos(href);
}

// Menu principal e listas do rodapé sem os itens que a configuração esconde.
export function itensDoMenu(itens: ItemDoMenu[], configuracao: ConfiguracaoDoSite): ItemDoMenu[] {
  return itens.filter((item) => !item.href || linkDisponivel(item.href, configuracao));
}

export function linksDisponiveis(links: LinkDeNavegacao[], configuracao: ConfiguracaoDoSite): LinkDeNavegacao[] {
  return links.filter((link) => linkDisponivel(link.href, configuracao));
}

// Formulário da caixa "Menu e rodapé": "sim" ou "nao"; outro valor recusa.
export function lerArtigosAtivoDoFormulario(valor: unknown): { ok: true; artigosAtivo: boolean } | { ok: false; mensagem: string } {
  if (valor === "sim") return { ok: true, artigosAtivo: true };
  if (valor === "nao") return { ok: true, artigosAtivo: false };
  return { ok: false, mensagem: "Não foi possível ler a escolha. Recarregue a página e tente de novo." };
}
