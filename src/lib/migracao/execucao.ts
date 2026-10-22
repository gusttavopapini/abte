// Regras comuns dos scripts de migração do site antigo (etapa 6), puras e sem
// dependências: argumentos da linha de comando, projeto permitido, id da
// execução e autor do registro de alterações. Testadas em
// testes/unidade/migracao.test.mts.
import type { AutorDaAlteracao } from "../log/alteracoes.ts";

// Projetos em que um script de migração pode gravar. O id vem sempre do
// argumento --confirmo-projeto, conferido contra esta lista: a produção
// (etapa 9, conta da ABTE) entra aqui quando for criada, sem mudar os scripts.
export const PROJETOS_PERMITIDOS: readonly string[] = ["abte-dev"];

// Nos emuladores (testes), só projetos de demonstração.
const PREFIXO_DO_EMULADOR = "demo-";

// Quem aparece no registro de alterações quando o script grava. Não é um
// usuário do Authentication, e o papel "sistema" não dá acesso ao painel.
export const AUTOR_DA_MIGRACAO: AutorDaAlteracao = { uid: "migracao", nome: "Migração do site antigo (script)", papel: "sistema" };

export type Modo = "simulacao" | "executar";

export type Argumentos = {
  modo: Modo;
  desfazer: boolean;
  confirmoProjeto: string | null;
  limite: number | null;
  // Execução a desfazer (só com --desfazer).
  execucao: string | null;
  tipo: string | null;
  entrada: string | null;
  mapa: string | null;
  incluirEditadas: boolean;
};

const CONHECIDOS = ["--executar", "--desfazer", "--confirmo-projeto", "--limite", "--execucao", "--tipo", "--entrada", "--mapa", "--incluir-editadas"];

// Id de uma execução: data e hora (UTC) e 4 letras aleatórias, ex.:
// 20261021-223015-a1b2. Vai nos documentos, no registro e no relatório.
const FORMATO_DA_EXECUCAO = /^\d{8}-\d{6}-[0-9a-f]{4}$/;

export function novoIdDeExecucao(agora: Date, aleatorio: () => number = Math.random): string {
  const dois = (n: number) => String(n).padStart(2, "0");
  const data = `${agora.getUTCFullYear()}${dois(agora.getUTCMonth() + 1)}${dois(agora.getUTCDate())}`;
  const hora = `${dois(agora.getUTCHours())}${dois(agora.getUTCMinutes())}${dois(agora.getUTCSeconds())}`;
  const sufixo = Math.floor(aleatorio() * 0x10000).toString(16).padStart(4, "0");
  return `${data}-${hora}-${sufixo}`;
}

export function ehIdDeExecucao(valor: unknown): valor is string {
  return typeof valor === "string" && FORMATO_DA_EXECUCAO.test(valor);
}

// Lê os argumentos. Sem --executar, é sempre simulação (não grava nada).
export function lerArgumentos(argv: readonly string[]): { ok: true; argumentos: Argumentos } | { ok: false; mensagem: string } {
  const valores = new Map<string, string>();
  for (const arg of argv) {
    const nome = arg.includes("=") ? arg.slice(0, arg.indexOf("=")) : arg;
    if (!CONHECIDOS.includes(nome)) return { ok: false, mensagem: `Argumento desconhecido: ${nome}` };
    if (valores.has(nome)) return { ok: false, mensagem: `Argumento repetido: ${nome}` };
    valores.set(nome, arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : "");
  }
  const texto = (nome: string) => {
    const valor = valores.get(nome);
    return valor === undefined || valor === "" ? null : valor;
  };

  let limite: number | null = null;
  if (valores.has("--limite")) {
    limite = Number(valores.get("--limite"));
    if (!Number.isInteger(limite) || limite < 1) return { ok: false, mensagem: "--limite precisa ser um número inteiro maior que zero." };
  }
  const desfazer = valores.has("--desfazer");
  const execucao = texto("--execucao");
  if (desfazer && !ehIdDeExecucao(execucao)) return { ok: false, mensagem: "--desfazer exige --execucao=<id da execução> (ex.: 20261021-223015-a1b2)." };
  if (!desfazer && execucao !== null) return { ok: false, mensagem: "--execucao só vale junto com --desfazer." };
  if (desfazer && (valores.has("--limite") || valores.has("--tipo"))) return { ok: false, mensagem: "--desfazer não aceita --limite nem --tipo." };

  return {
    ok: true,
    argumentos: {
      modo: valores.has("--executar") ? "executar" : "simulacao",
      desfazer,
      confirmoProjeto: texto("--confirmo-projeto"),
      limite,
      execucao,
      tipo: texto("--tipo"),
      entrada: texto("--entrada"),
      mapa: texto("--mapa"),
      incluirEditadas: valores.has("--incluir-editadas"),
    },
  };
}

// Confere o projeto antes de qualquer leitura. Fora dos emuladores, só um
// projeto da lista; para gravar, --confirmo-projeto precisa repetir o id
// exibido. Nos emuladores, só projetos "demo-".
export function conferirProjeto(opcoes: {
  projectId: string | undefined;
  emulador: boolean;
  modo: Modo;
  confirmoProjeto: string | null;
  permitidos?: readonly string[];
}): { ok: true } | { ok: false; mensagem: string } {
  const { projectId, emulador, modo, confirmoProjeto, permitidos = PROJETOS_PERMITIDOS } = opcoes;
  if (!projectId) return { ok: false, mensagem: "Preencha FIREBASE_ADMIN_PROJECT_ID no .env.local. Nada foi feito." };
  if (emulador && !projectId.startsWith(PREFIXO_DO_EMULADOR)) {
    return { ok: false, mensagem: `Nos emuladores, só projetos "${PREFIXO_DO_EMULADOR}...". Nada foi feito.` };
  }
  if (!emulador && !permitidos.includes(projectId)) {
    return { ok: false, mensagem: `O projeto ${projectId} não está na lista de projetos permitidos para a migração. Nada foi feito.` };
  }
  if (modo === "executar" && confirmoProjeto !== projectId) {
    return { ok: false, mensagem: `Nada foi gravado: para gravar, repita com --executar --confirmo-projeto=${projectId}` };
  }
  return { ok: true };
}
