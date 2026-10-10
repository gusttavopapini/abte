// Validação e padronização dos contatos dos profissionais (WhatsApp,
// Instagram, Facebook e e-mail). Funções puras, com mensagens em português,
// usadas pelas ações do painel e pelos testes de unidade.
// Cada função também percebe contato colado no campo errado (ex.: e-mail no
// campo do WhatsApp) e diz em qual campo ele deveria estar.
import { PAISES, type CodigoDePais } from "../config/profissionais.ts";
import { ehEmailValido } from "./validacao.ts";

export type ResultadoDoContato = { ok: true; valor: string } | { ok: false; erro: string };

type Campo = "whatsapp" | "instagram" | "facebook" | "email";

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
  if (campoAtual !== "whatsapp" && (LINK_WHATSAPP.test(valor) || PARECE_TELEFONE.test(valor))) {
    return "Isto parece um número de telefone. Coloque no campo WhatsApp.";
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
