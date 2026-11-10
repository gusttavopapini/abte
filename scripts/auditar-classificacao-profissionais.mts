// Auditoria da classificação dos profissionais (10/11/2026). Lê todos os
// profissionais (ativos, ocultos e na lixeira) e compara o tipo gravado com o
// conselho do registro, a página do site antigo (docs/dados-privados/
// profissionais.json, campo fonte) e a planilha do lote 1 (docs/dados-
// privados/lote-1.json). Regras em src/lib/migracao/classificacaoProfissionais.ts.
// Por padrão SÓ LÊ. Gravar as correções (só as que têm duas fontes de acordo
// e nenhuma contra): -- --executar --confirmo-projeto=<id exibido>; cada uma
// passa por gravarProfissional, com uma linha em logAlteracoes assinada
// "Ajuste de classificação (script)". Terminal e relatório em tmp-migracao/
// só com contagens e ids; nomes e motivos só em docs/dados-privados/.
import { readFileSync, writeFileSync } from "node:fs";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { aplicarCorrecoes, auditarClassificacao, type RegistroDaOrigem, type RegistroDaPlanilha } from "../src/lib/migracao/classificacaoProfissionais.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const NOME = "auditar-classificacao-profissionais";
const ORIGEM = "docs/dados-privados/profissionais.json";
const PLANILHA = "docs/dados-privados/lote-1.json";
const LISTA_PRIVADA = "docs/dados-privados/classificacao-profissionais.md";

let liberarTrava: (() => void) | null = null;

function parar(mensagem: string): never {
  console.error(mensagem);
  liberarTrava?.();
  process.exit(1);
}

function iniciar(projectId: string, emulador: boolean): App {
  if (emulador) return initializeApp({ projectId }, NOME);
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) parar("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, NOME);
}

function lerLista<T>(caminho: string, chave: string): Map<string, T> {
  try {
    const dados = JSON.parse(readFileSync(caminho, "utf8")) as { profissionais?: (T & Record<string, unknown>)[] };
    return new Map((dados.profissionais ?? []).map((registro) => [String(registro[chave]), registro]));
  } catch {
    console.log(`Arquivo não lido (${caminho}): a fonte fica vazia.`);
    return new Map();
  }
}

async function principal() {
  const lidos = lerArgumentos(process.argv.slice(2));
  if (!lidos.ok) parar(`${lidos.mensagem} Nada foi feito.`);
  const args = lidos.argumentos;
  if (args.desfazer || args.tipo !== null || args.mapa !== null || args.uid !== null || args.limite !== null || args.incluirEditadas || args.entrada !== null) {
    parar("Este script só aceita --executar e --confirmo-projeto. Nada foi feito.");
  }
  const emulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const projeto = conferirProjeto({ projectId, emulador, modo: args.modo, confirmoProjeto: args.confirmoProjeto });
  if (!projeto.ok) parar(projeto.mensagem);

  const execucao = novoIdDeExecucao(new Date());
  console.log(`Projeto: ${projectId}${emulador ? " (emulador)" : ""}`);
  console.log(`Modo: ${args.modo === "executar" ? "EXECUTAR (grava as correções)" : "só leitura (não grava nada)"}`);
  console.log(`Execução: ${execucao}`);

  const trava = adquirirTrava(PASTA_DA_SAIDA, NOME);
  if (!trava.ok) parar(`Outra execução está em andamento ou parou no meio (${trava.caminho}). Confira e apague a trava antes de repetir.`);
  liberarTrava = trava.liberar;
  try {
    const db = getFirestore(iniciar(projectId as string, emulador));
    const documentos = (await db.collection("profissionais").get()).docs;
    const profissionais = documentos.map((documento) => {
      const dados = documento.data();
      const origem = dados.origem && typeof dados.origem === "object" ? { sistema: String(dados.origem.sistema ?? ""), chave: String(dados.origem.chave ?? "") } : null;
      return {
        id: documento.id,
        tipo: typeof dados.tipo === "string" ? dados.tipo : "",
        nome: typeof dados.nome === "string" ? dados.nome : "",
        registro: typeof dados.registro === "string" ? dados.registro : "",
        pais: typeof dados.pais === "string" ? dados.pais : "",
        uf: typeof dados.uf === "string" ? dados.uf : "",
        cidades: Array.isArray(dados.cidades) ? dados.cidades.map(String) : [],
        ativo: dados.ativo === true,
        excluido: Boolean(dados.excluidoEm),
        origem,
      };
    });
    const r = auditarClassificacao({ profissionais, origem: lerLista<RegistroDaOrigem>(ORIGEM, "id"), planilha: lerLista<RegistroDaPlanilha>(PLANILHA, "chave") });

    console.log(`\nAuditados: ${r.total} (ativos ${r.ativos}, ocultos ${r.ocultos}, na lixeira ${r.naLixeira})`);
    console.log(`Por tipo: ${JSON.stringify(r.porTipo)}`);
    console.log(`Tipo confere com as fontes: ${r.confere}; a corrigir: ${r.correcoes.length}; em dúvida: ${r.duvidas.length}`);
    const porAssunto = r.pontos.reduce<Record<string, number>>((soma, ponto) => ({ ...soma, [ponto.assunto]: (soma[ponto.assunto] ?? 0) + 1 }), {});
    console.log(`Outros pontos para conferir: ${JSON.stringify(porAssunto)}`);

    let gravacao: Awaited<ReturnType<typeof aplicarCorrecoes>> | null = null;
    if (args.modo === "executar" && r.correcoes.length > 0) {
      gravacao = await aplicarCorrecoes({ db, correcoes: r.correcoes, execucao });
      console.log(`Gravados: ${gravacao.gravados.length}; falhas: ${gravacao.falhas.length}`);
    }

    const markdown = [
      `# Auditoria da classificação dos profissionais ${execucao}: ${args.modo === "executar" ? "EXECUÇÃO" : "SÓ LEITURA"}`,
      "",
      `Projeto: ${projectId}. Auditados: ${r.total} (ativos ${r.ativos}, ocultos ${r.ocultos}, na lixeira ${r.naLixeira}).`,
      `Confere: ${r.confere}; a corrigir: ${r.correcoes.length}; em dúvida: ${r.duvidas.length}; outros pontos: ${r.pontos.length}.`,
      "",
      "## Correções (ids)",
      ...(r.correcoes.length ? r.correcoes.map((c) => `- ${c.id}: ${c.de} para ${c.para}`) : ["- nenhuma"]),
      "",
      "## Dúvidas e pontos (ids e assunto; motivos só no arquivo privado)",
      ...[...r.duvidas, ...r.pontos].map((p) => `- ${p.id}: ${p.assunto}`),
      "",
    ].join("\n");
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `${NOME}-${execucao}`, { ...r, duvidas: r.duvidas.map(({ id, assunto }) => ({ id, assunto })), pontos: r.pontos.map(({ id, assunto }) => ({ id, assunto })), gravacao }, markdown);

    // Nomes e motivos só na pasta privada (fora do Git).
    const nomes = new Map(profissionais.map((p) => [p.id, `${p.nome} (${p.tipo || "sem tipo"}, ${p.id})`]));
    writeFileSync(
      LISTA_PRIVADA,
      [
        `# Classificação dos profissionais (${execucao}, ${args.modo === "executar" ? "execução" : "só leitura"})`,
        "",
        `Auditados: ${r.total}. Confere: ${r.confere}. A corrigir: ${r.correcoes.length}. Em dúvida: ${r.duvidas.length}.`,
        "",
        "## Correções",
        ...(r.correcoes.length ? r.correcoes.map((c) => `- ${nomes.get(c.id)}: ${c.de} para ${c.para}`) : ["- nenhuma"]),
        "",
        "## Em dúvida (não alterados)",
        ...(r.duvidas.length ? r.duvidas.map((p) => `- ${nomes.get(p.id)}: ${p.motivo}`) : ["- nenhum"]),
        "",
        "## Outros pontos para conferir (não alterados)",
        ...(r.pontos.length ? r.pontos.map((p) => `- [${p.assunto}] ${nomes.get(p.id)}: ${p.motivo}`) : ["- nenhum"]),
        "",
      ].join("\n"),
    );
    console.log(`Relatório: ${caminhos.md}`);
    console.log(`Lista com nomes (privada): ${LISTA_PRIVADA}`);
  } finally {
    liberarTrava?.();
  }
}

await principal();
process.exit(0);
