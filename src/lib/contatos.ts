// Validação e padronização dos contatos dos profissionais (WhatsApp,
// telefones, Instagram, Facebook e e-mail). Funções puras, com mensagens em português,
// usadas pelas ações do painel e pelos testes de unidade.
// Cada função também percebe contato colado no campo errado (ex.: e-mail no
// campo do WhatsApp) e diz em qual campo ele deveria estar.
import { PAISES, type CodigoDePais } from "../config/profissionais.ts";
import { ehEmailValido } from "./validacao.ts";

export type ResultadoDoContato = { ok: true; valor: string } | { ok: false; erro: string };

type Campo = "whatsapp" | "telefone" | "instagram" | "facebook" | "email";

const valido = (valor: string): ResultadoDoContato => ({ ok: true, valor });
const invalido = (erro: string): ResultadoDoContato => ({ ok: false, erro });

const PARECE_EMAIL = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;
const LINK_INSTAGRAM = /(^|[/.])(instagram\.com|instagr\.am)(\/|$)/i;
const LINK_FACEBOOK = /(^|[/.])(facebook\.com|fb\.com|fb\.me)(\/|$)/i;
const LINK_WHATSAPP = /(^|[/.])(wa\.me|whatsapp\.com)(\/|$)/i;
const PARECE_TELEFONE = /^\+?[\d\s().-]{8,}$/;

// Diz em que campo o valor deveria estar, se parecer de outro tipo de contato.
function campoTrocado(valor: string, campoAtual: Campo): string | null {
  if (campoAtual !== "email" && PARECE_EMAIL.test(valor)) return "Isto parece um e-mail. Coloque no campo E-mail.";
  if (campoAtual !== "instagram" && LINK_INSTAGRAM.test(valor)) return "Isto parece um link do Instagram. Coloque no campo Instagram.";
  if (campoAtual !== "facebook" && LINK_FACEBOOK.test(valor)) return "Isto parece um link do Facebook. Coloque no campo Facebook.";
  if (campoAtual === "telefone" && LINK_WHATSAPP.test(valor)) return "Isto parece um link do WhatsApp. Coloque no campo WhatsApp.";
  if (campoAtual !== "whatsapp" && campoAtual !== "telefone" && (LINK_WHATSAPP.test(valor) || PARECE_TELEFONE.test(valor))) {
    return "Isto parece um número de telefone. Coloque no campo WhatsApp ou Telefones.";
  }
  return null;
}

// Quantidade de dígitos do número completo (com o código do país) aceita em cada país.
function numeroCompletoValido(digitos: string): boolean {
  if (digitos.startsWith("55")) {
    // Brasil: 55 + DDD (dois dígitos de 1 a 9) + 8 dígitos (fixo) ou 9 começando por 9 (celular).
    const ddd = digitos.slice(2, 4);
    const numero = digitos.slice(4);
    if (!/^[1-9]{2}$/.test(ddd)) return false;
    return numero.length === 8 || (numero.length === 9 && numero.startsWith("9"));
  }
  // Paraguai: 595 + 8 ou 9 dígitos. Bolívia: 591 + 8 dígitos.
  if (digitos.startsWith("595")) return digitos.length === 11 || digitos.length === 12;
  if (digitos.startsWith("591")) return digitos.length === 11;
  return false;
}

// WhatsApp: guarda só os dígitos, com o código do país (ex.: 5511912345678),
// pronto para o link https://wa.me/<dígitos>. Sem código do país, usa o do
// país do profissional.
export function validarWhatsapp(entrada: string, pais: CodigoDePais): ResultadoDoContato {
  const valor = entrada.trim();
  if (!valor) return valido("");
  const trocado = campoTrocado(valor, "whatsapp");
  if (trocado) return invalido(trocado);

  let texto = valor;
  if (LINK_WHATSAPP.test(texto)) {
    const numeroDoLink = texto.match(/(?:wa\.me\/|phone=)\+?(\d+)/i);
    if (!numeroDoLink) return invalido("Link do WhatsApp sem número. Informe o número de telefone.");
    texto = `+${numeroDoLink[1]}`;
  }
  if (/[^\d\s()+.-]/.test(texto)) return invalido("Use só números, espaços, parênteses, hífen e o sinal de +.");

  let digitos = texto.replace(/\D/g, "");
  const internacional = texto.trim().startsWith("+") || digitos.startsWith("00");
  if (digitos.startsWith("00")) digitos = digitos.slice(2);
  if (!internacional && !numeroCompletoValido(digitos)) {
    // Número nacional: tira o zero de longa distância e põe o código do país.
    const ddi = PAISES.find((item) => item.codigo === pais)?.ddi ?? "55";
    digitos = ddi + digitos.replace(/^0+/, "");
  }
  if (!numeroCompletoValido(digitos)) {
    return invalido("Número de WhatsApp inválido. Confira o código de área (DDD) e o número; para outro país, comece com + e o código do país.");
  }
  return valido(digitos);
}

// Telefone (fixo ou celular, 06/11/2026): mesma padronização do WhatsApp
// (só os dígitos, com o código do país), pronto para o link tel:+<dígitos>.
export function validarTelefone(entrada: string, pais: CodigoDePais): ResultadoDoContato {
  const valor = entrada.trim();
  if (!valor) return valido("");
  const trocado = campoTrocado(valor, "telefone");
  if (trocado) return invalido(trocado);
  if (/[^\d\s()+.-]/.test(valor)) return invalido("Use só números, espaços, parênteses, hífen e o sinal de +.");
  let digitos = valor.replace(/\D/g, "");
  const internacional = valor.startsWith("+") || digitos.startsWith("00");
  if (digitos.startsWith("00")) digitos = digitos.slice(2);
  if (!internacional && !numeroCompletoValido(digitos)) {
    const ddi = PAISES.find((item) => item.codigo === pais)?.ddi ?? "55";
    digitos = ddi + digitos.replace(/^0+/, "");
  }
  if (!numeroCompletoValido(digitos)) {
    return invalido("Telefone inválido. Confira o código de área (DDD) e o número; para outro país, comece com + e o código do país.");
  }
  return valido(digitos);
}

export const LIMITE_DE_TELEFONES = 3;

export type ResultadoDosTelefones = { ok: true; valor: string[] } | { ok: false; erro: string };

// Vários telefones num campo só, separados por vírgula, ponto e vírgula ou
// linha; até LIMITE_DE_TELEFONES, sem repetir. O erro cita a posição.
export function validarTelefones(entrada: string, pais: CodigoDePais): ResultadoDosTelefones {
  const partes = entrada.split(/[,;\n]/).map((parte) => parte.trim()).filter(Boolean);
  if (partes.length > LIMITE_DE_TELEFONES) return { ok: false, erro: `Informe no máximo ${LIMITE_DE_TELEFONES} telefones.` };
  const numeros: string[] = [];
  for (const [indice, parte] of partes.entries()) {
    const resultado = validarTelefone(parte, pais);
    if (!resultado.ok) return { ok: false, erro: partes.length > 1 ? `Telefone ${indice + 1}: ${resultado.erro}` : resultado.erro };
    if (!numeros.includes(resultado.valor)) numeros.push(resultado.valor);
  }
  return { ok: true, valor: numeros };
}

// Número para ler na tela: "(11) 3333-4444" ou "(11) 93333-4444" no Brasil;
// nos outros países, "+595 21 123 456" (só os grupos de dígitos).
export function telefoneParaLeitura(digitos: string): string {
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    const ddd = digitos.slice(2, 4);
    const numero = digitos.slice(4);
    return `(${ddd}) ${numero.slice(0, numero.length - 4)}-${numero.slice(-4)}`;
  }
  return `+${digitos}`;
}

// Fixo brasileiro (DDD e 8 dígitos começando de 2 a 5): não tem WhatsApp
// pessoal na maior parte dos casos; usado pelo importador de telefones.
export function ehFixoBrasileiro(digitos: string): boolean {
  return digitos.startsWith("55") && digitos.length === 12 && /^[2-5]/.test(digitos.slice(4));
}

// Caminhos do Instagram que não são perfil (publicação, vídeo, busca...).
const CAMINHOS_QUE_NAO_SAO_PERFIL = new Set(["p", "reel", "reels", "tv", "explore", "stories", "accounts", "direct"]);
const USUARIO_INSTAGRAM = /^(?!\.)(?!.*\.\.)[a-z0-9._]{1,30}(?<!\.)$/;

// Instagram: guarda o nome de usuário, sem @ e em minúsculas (ex.: abte.escoliose).
// Aceita @usuario, usuario ou o link do perfil.
export function validarInstagram(entrada: string): ResultadoDoContato {
  const valor = entrada.trim();
  if (!valor) return valido("");
  const trocado = campoTrocado(valor, "instagram");
  if (trocado) return invalido(trocado);

  let usuario = valor;
  if (LINK_INSTAGRAM.test(usuario)) {
    const caminho = usuario.match(/(?:instagram\.com|instagr\.am)\/([^/?#\s]+)/i);
    if (!caminho) return invalido("Link do Instagram sem o nome do perfil. Use @usuario ou o link do perfil.");
    usuario = caminho[1];
    if (CAMINHOS_QUE_NAO_SAO_PERFIL.has(usuario.toLowerCase())) {
      return invalido("Este é o link de uma publicação. Use o link do perfil ou @usuario.");
    }
  } else if (/^https?:\/\//i.test(usuario) || usuario.includes("/")) {
    return invalido("Isto não é um perfil do Instagram. Use @usuario ou o link do perfil.");
  }

  usuario = usuario.replace(/^@/, "").toLowerCase();
  if (!USUARIO_INSTAGRAM.test(usuario)) {
    return invalido("Usuário do Instagram inválido. Use letras, números, ponto e sublinhado, até 30 caracteres.");
  }
  return valido(usuario);
}

// Caminhos do Facebook que não são página nem perfil.
const CAMINHOS_FACEBOOK_INVALIDOS = new Set(["sharer", "sharer.php", "share", "watch", "photo", "photo.php", "story.php", "events", "groups", "login", "help"]);
const NOME_FACEBOOK = /^[A-Za-z0-9.-]{2,80}$/;

// Facebook: guarda o link do perfil ou da página (ex.: https://www.facebook.com/tratando.escoliose).
// Aceita o link ou só o nome de usuário.
export function validarFacebook(entrada: string): ResultadoDoContato {
  const valor = entrada.trim();
  if (!valor) return valido("");
  const trocado = campoTrocado(valor, "facebook");
  if (trocado) return invalido(trocado);

  if (!LINK_FACEBOOK.test(valor)) {
    if (/^https?:\/\//i.test(valor) || valor.includes("/")) {
      return invalido("Isto não é um link do Facebook. Use o link do perfil ou da página.");
    }
    const nome = valor.replace(/^@/, "");
    if (!/^[A-Za-z0-9.]{5,50}$/.test(nome)) return invalido("Nome de usuário do Facebook inválido. Use o link do perfil ou da página.");
    return valido(`https://www.facebook.com/${nome}`);
  }

  let endereco: URL;
  try {
    endereco = new URL(/^https?:\/\//i.test(valor) ? valor : `https://${valor}`);
  } catch {
    return invalido("Link do Facebook inválido. Use o link do perfil ou da página.");
  }
  const caminho = endereco.pathname.split("/").filter(Boolean);
  if (caminho[0] === "profile.php") {
    const id = endereco.searchParams.get("id");
    if (!id || !/^\d+$/.test(id)) return invalido("Link do Facebook sem o número do perfil.");
    return valido(`https://www.facebook.com/profile.php?id=${id}`);
  }
  if (caminho.length === 0) return invalido("Link do Facebook sem o nome do perfil ou da página.");
  if (CAMINHOS_FACEBOOK_INVALIDOS.has(caminho[0].toLowerCase()) || caminho.length > 1 || !NOME_FACEBOOK.test(caminho[0])) {
    return invalido("Use o link do perfil ou da página, não de uma publicação ou de um grupo.");
  }
  return valido(`https://www.facebook.com/${caminho[0]}`);
}

const LIMITE_EMAIL = 254;

// E-mail: guarda sem espaços nas pontas e em minúsculas.
export function validarEmailDeContato(entrada: string): ResultadoDoContato {
  const valor = entrada.trim();
  if (!valor) return valido("");
  // Só procura contato trocado se não tiver formato de e-mail.
  const trocado = PARECE_EMAIL.test(valor) ? null : campoTrocado(valor, "email");
  if (trocado) return invalido(trocado);
  if (valor.length > LIMITE_EMAIL || !ehEmailValido(valor)) return invalido("E-mail inválido. Use o formato nome@dominio.com.br.");
  return valido(valor.toLowerCase());
}

// ---------- Campos extras dos profissionais (08/11/2026) ----------

export const LIMITE_DO_SITE = 300;
export const LIMITE_DE_OUTROS_PERFIS = 5;
export const LIMITE_DO_ROTULO_DO_PERFIL = 40;
export const LIMITE_DE_EMAILS_EXTRAS = 3;

export type PerfilExtra = { rotulo: string; url: string };

// Endereço http(s) com domínio (sem usuário e senha). Sem o protocolo, vale
// https. Devolve o endereço padronizado ou null.
function enderecoWeb(valor: string): string | null {
  let endereco: URL;
  try {
    endereco = new URL(/^[a-z][a-z0-9+.-]*:/i.test(valor) ? valor : `https://${valor}`);
  } catch {
    return null;
  }
  if (endereco.protocol !== "https:" && endereco.protocol !== "http:") return null;
  if (endereco.username || endereco.password) return null;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(endereco.hostname)) return null;
  return endereco.href;
}

// Site do profissional ou da clínica: link http(s) com domínio, até 300
// caracteres. Instagram, Facebook e WhatsApp têm campos próprios.
export function validarSite(entrada: string): ResultadoDoContato {
  const valor = entrada.trim();
  if (!valor) return valido("");
  if (LINK_INSTAGRAM.test(valor) || LINK_FACEBOOK.test(valor) || LINK_WHATSAPP.test(valor) || PARECE_EMAIL.test(valor)) {
    return invalido("Isto parece um contato (Instagram, Facebook, WhatsApp ou e-mail). Use o campo próprio dele.");
  }
  const endereco = enderecoWeb(valor);
  if (!endereco || endereco.length > LIMITE_DO_SITE) return invalido("Site inválido. Use o endereço completo, como https://www.exemplo.com.br.");
  return valido(endereco);
}

// Outros perfis: um por linha, "Rótulo | link" ou só o link. @usuario ou
// um nome de usuário solto valem como Instagram. Até 5.
export function validarOutrosPerfis(entrada: string): { ok: true; valor: PerfilExtra[] } | { ok: false; erro: string } {
  const linhas = entrada.split(/\n/).map((linha) => linha.trim()).filter(Boolean);
  if (linhas.length > LIMITE_DE_OUTROS_PERFIS) return { ok: false, erro: `Informe no máximo ${LIMITE_DE_OUTROS_PERFIS} perfis.` };
  const perfis: PerfilExtra[] = [];
  for (const linha of linhas) {
    const separador = linha.indexOf("|");
    const rotuloDado = separador >= 0 ? linha.slice(0, separador).trim() : "";
    const valor = separador >= 0 ? linha.slice(separador + 1).trim() : linha;
    if (rotuloDado.length > LIMITE_DO_ROTULO_DO_PERFIL) return { ok: false, erro: `Cada rótulo aceita no máximo ${LIMITE_DO_ROTULO_DO_PERFIL} caracteres.` };
    let perfil: PerfilExtra;
    if (LINK_INSTAGRAM.test(valor) || /^@?[A-Za-z0-9._]{1,30}$/.test(valor)) {
      const instagram = validarInstagram(valor);
      if (!instagram.ok || !instagram.valor) return { ok: false, erro: `Perfil inválido: ${valor.slice(0, 60)}. Use o link completo ou @usuario do Instagram.` };
      perfil = { rotulo: rotuloDado || "Instagram", url: `https://www.instagram.com/${instagram.valor}/` };
    } else if (LINK_FACEBOOK.test(valor)) {
      const facebook = validarFacebook(valor);
      if (!facebook.ok || !facebook.valor) return { ok: false, erro: facebook.ok ? "Link do Facebook inválido." : facebook.erro };
      perfil = { rotulo: rotuloDado || "Facebook", url: facebook.valor };
    } else {
      const endereco = enderecoWeb(valor);
      if (!endereco || endereco.length > LIMITE_DO_SITE || PARECE_EMAIL.test(valor)) return { ok: false, erro: `Perfil inválido: ${valor.slice(0, 60)}. Use o link completo, como https://...` };
      perfil = { rotulo: rotuloDado || new URL(endereco).hostname.replace(/^www\./, ""), url: endereco };
    }
    if (!perfis.some((item) => item.url === perfil.url)) perfis.push(perfil);
  }
  return { ok: true, valor: perfis };
}

// Texto do campo do painel a partir dos perfis gravados.
export function outrosPerfisComoTexto(perfis: readonly PerfilExtra[]): string {
  return perfis.map((perfil) => `${perfil.rotulo} | ${perfil.url}`).join("\n");
}

// E-mails extras: separados por vírgula, ponto e vírgula ou linha; até 3.
export function validarEmailsExtras(entrada: string): { ok: true; valor: string[] } | { ok: false; erro: string } {
  const partes = entrada.split(/[,;\n]/).map((parte) => parte.trim()).filter(Boolean);
  if (partes.length > LIMITE_DE_EMAILS_EXTRAS) return { ok: false, erro: `Informe no máximo ${LIMITE_DE_EMAILS_EXTRAS} e-mails extras.` };
  const emails: string[] = [];
  for (const parte of partes) {
    const resultado = validarEmailDeContato(parte);
    if (!resultado.ok) return { ok: false, erro: `E-mail extra inválido: ${parte.slice(0, 60)}. Use o formato nome@dominio.com.br.` };
    if (!emails.includes(resultado.valor)) emails.push(resultado.valor);
  }
  return { ok: true, valor: emails };
}
