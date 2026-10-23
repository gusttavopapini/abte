// Importação dos posts do blog do site antigo (etapa 6, degrau 4b), todos
// como rascunho e com revisarMigracao = true, a partir do Markdown restrito
// já convertido (npm run migracao:converter-posts).
//
// Uso:
//   npm run migracao:posts                                     simulação (padrão)
//   npm run migracao:posts -- --executar --confirmo-projeto=<id exibido> [--limite=N]
//   npm run migracao:posts -- --desfazer --execucao=<id>       simulação da reversão
//   npm run migracao:posts -- --desfazer --execucao=<id> --executar --confirmo-projeto=<id exibido>
//   (com --incluir-editadas, os alterados por pessoa também saem: rode antes a
//   simulação e confirme com --confirmo-apagar-editadas=<quantidade mostrada>)
//
// Por padrão SÓ SIMULA: lê os arquivos e as coleções midias, posts e
// profissionais, sem gravar no Firebase. Gravar exige --executar E
// --confirmo-projeto com o id do projeto exibido (da lista
// PROJETOS_PERMITIDOS), a migração das imagens já executada e nenhuma
// colisão de slug.
//
// Entradas (fora do Git, em docs/dados-privados/): mapa-site-antigo.jsonl
// (--mapa), imagens-origem.json e posts-convertidos/ ({slug}.md e
// indice.json). Saídas em tmp-migracao/ (fora do Git): o relatório, só com
// slugs e contagens, e a tabela PROPOSTA de redirecionamentos
// (redirects.json, nada ativado); em docs/dados-privados/ (fora do Git), a
// lista sugestao-autor-diretoria.md. Lê as credenciais do .env e do .env.local
// e nunca as exibe. Com FIRESTORE_EMULATOR_HOST definida, usa o emulador.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { conferirProjeto, lerArgumentos, novoIdDeExecucao } from "../src/lib/migracao/execucao.ts";
import { validarImagensOrigem } from "../src/lib/migracao/imagensOrigem.ts";
import { desfazerPosts, migrarPosts, relatorioDosPostsEmMarkdown, sugestoesPelaDiretoria, type PostConvertido } from "../src/lib/migracao/posts.ts";
import { lerPostsDoMapa } from "../src/lib/migracao/postsConversao.ts";
import { juntarRedirecionamentos } from "../src/lib/migracao/produtos.ts";
import { PASTA_DA_SAIDA, adquirirTrava, gravarRelatorio } from "../src/lib/migracao/saida.ts";

const MAPA_PADRAO = "docs/dados-privados/mapa-site-antigo.jsonl";
const IMAGENS = "docs/dados-privados/imagens-origem.json";
const CONVERTIDOS = "docs/dados-privados/posts-convertidos";
const REDIRECTS = join(PASTA_DA_SAIDA, "redirects.json");
// Fora do Git: posts com a foto do autor só da diretoria (para religar depois).
const SUGESTOES_DA_DIRETORIA = "docs/dados-privados/sugestao-autor-diretoria.md";

// A trava é liberada antes de sair, inclusive quando o script para no meio.
let liberarTrava: (() => void) | null = null;

function parar(mensagem: string): never {
  console.error(mensagem);
  liberarTrava?.();
  process.exit(1);
}

function iniciar(projectId: string, emulador: boolean): App {
  if (emulador) return initializeApp({ projectId }, "migrar-posts");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) parar("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "migrar-posts");
}

function lerJson(caminho: string): unknown {
  try {
    return JSON.parse(readFileSync(caminho, "utf8"));
  } catch {
    parar(`Arquivo não encontrado ou não é JSON: ${caminho}. Nada foi feito.`);
  }
}

type ItemDoIndice = { slug: string; descricaoMeta?: string | null; fotoDoAutorWix?: string | null; capaRemovidaDoCorpo?: boolean; paraRevisar?: string[] };

// Junta o mapa e a conversão. Todo post do mapa precisa estar convertido.
function lerConvertidos(conteudoDoMapa: string): PostConvertido[] {
  const mapa = lerPostsDoMapa(conteudoDoMapa);
  if (!mapa.ok) parar(`Mapa recusado:\n${mapa.erros.map((erro) => `  ${erro}`).join("\n")}\nNada foi feito.`);
  const indice = lerJson(join(CONVERTIDOS, "indice.json")) as { posts?: ItemDoIndice[] };
  const porSlug = new Map((indice.posts ?? []).map((item) => [item.slug, item]));
  const faltando = mapa.posts.filter((post) => !porSlug.has(post.slug) || !existsSync(join(CONVERTIDOS, `${post.slug.normalize("NFC")}.md`)));
  if (faltando.length) parar(`${faltando.length} post(s) do mapa sem conversão em ${CONVERTIDOS}/. Rode antes npm run migracao:converter-posts. Nada foi feito.`);
  return mapa.posts.map((doMapa) => {
    const item = porSlug.get(doMapa.slug) as ItemDoIndice;
    return {
      doMapa,
      markdown: readFileSync(join(CONVERTIDOS, `${doMapa.slug.normalize("NFC")}.md`), "utf8"),
      descricaoMeta: item.descricaoMeta ?? null,
      fotoDoAutorWix: item.fotoDoAutorWix ?? null,
      capaRemovidaDoCorpo: item.capaRemovidaDoCorpo === true,
      paraRevisar: item.paraRevisar ?? [],
    };
  });
}

async function principal() {
  const lidos = lerArgumentos(process.argv.slice(2));
  if (!lidos.ok) parar(`${lidos.mensagem} Nada foi feito.`);
  const args = lidos.argumentos;
  if (args.tipo !== null || args.uid !== null || args.entrada !== null) parar("Este script não aceita --tipo, --uid nem --entrada. Nada foi feito.");

  const emulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const projeto = conferirProjeto({ projectId, emulador, modo: args.modo, confirmoProjeto: args.confirmoProjeto });
  if (!projeto.ok) parar(projeto.mensagem);

  const execucao = novoIdDeExecucao(new Date());
  console.log(`Projeto: ${projectId}${emulador ? " (emulador)" : ""}`);
  console.log(`Modo: ${args.modo === "executar" ? "EXECUTAR (grava)" : "simulação (não grava nada no Firebase)"}${args.desfazer ? ", desfazer" : ""}`);
  console.log(`Execução: ${execucao}`);

  const trava = adquirirTrava(PASTA_DA_SAIDA, "migrar-posts");
  if (!trava.ok) parar(`Outra execução está em andamento ou parou no meio (${trava.caminho}). Confira e apague a trava antes de repetir.`);
  liberarTrava = trava.liberar;
  try {
    const db = getFirestore(iniciar(projectId as string, emulador));

    if (args.desfazer) {
      const relatorio = await desfazerPosts({ db, execucaoAlvo: args.execucao as string, execucao, modo: args.modo, incluirEditados: args.incluirEditadas, confirmacaoDeEditados: args.confirmoApagarEditadas });
      const markdown = [
        `# Reversão da execução ${relatorio.execucaoDesfeita} (posts): ${relatorio.modo === "simulacao" ? "SIMULAÇÃO" : "EXECUÇÃO"}`,
        "",
        `Projeto: ${projectId}. Encontrados: ${relatorio.contagens.encontrados}; ${relatorio.modo === "simulacao" ? "seriam desfeitos" : "desfeitos"}: ${relatorio.contagens.desfeitos}; pulados: ${relatorio.contagens.pulados}.`,
        `Alterados por uma pessoa que sairiam (só com --incluir-editadas): ${relatorio.contagens.editadosPorPessoaQueSairiam}.`,
        relatorio.bloqueado ? `**${relatorio.bloqueado}**` : "",
        "",
        ...relatorio.pulados.map((item) => `- posts/${item.id}: ${item.motivo}`),
        "",
      ].join("\n");
      const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `migrar-posts-desfazer-${execucao}`, relatorio, markdown);
      console.log(`\nEncontrados: ${relatorio.contagens.encontrados}`);
      console.log(`${args.modo === "simulacao" ? "Seriam desfeitos" : "Desfeitos"}: ${relatorio.contagens.desfeitos}`);
      console.log(`Pulados: ${relatorio.contagens.pulados}`);
      if (args.incluirEditadas) console.log(`Alterados por uma pessoa que sairiam: ${relatorio.contagens.editadosPorPessoaQueSairiam}`);
      console.log(`Relatório: ${caminhos.md}`);
      if (relatorio.bloqueado) parar(relatorio.bloqueado);
      return;
    }

    let conteudoDoMapa: string;
    try {
      conteudoDoMapa = readFileSync(args.mapa ?? MAPA_PADRAO, "utf8");
    } catch {
      parar(`Arquivo não encontrado: ${args.mapa ?? MAPA_PADRAO}. Nada foi feito.`);
    }
    const posts = lerConvertidos(conteudoDoMapa);
    const imagens = validarImagensOrigem(lerJson(IMAGENS));
    if (!imagens.ok) parar(`imagens-origem.json recusado (${imagens.erros.length} problema(s)). Nada foi feito.`);

    const relatorio = await migrarPosts({ db, posts, imagensDeOrigem: imagens.imagens, modo: args.modo, execucao, limite: args.limite });
    if (!relatorio.ok) parar(relatorio.mensagem);
    const caminhos = gravarRelatorio(PASTA_DA_SAIDA, `migrar-posts-${execucao}`, relatorio, relatorioDosPostsEmMarkdown(relatorio, String(projectId)));
    const tabela = juntarRedirecionamentos(existsSync(REDIRECTS) ? JSON.parse(readFileSync(REDIRECTS, "utf8")) : null, relatorio.redirecionamentos, new Date().toISOString());
    writeFileSync(REDIRECTS, `${JSON.stringify(tabela, null, 2)}\n`, { mode: 0o600 });
    const pelaDiretoria = sugestoesPelaDiretoria(posts, imagens.imagens);
    writeFileSync(
      SUGESTOES_DA_DIRETORIA,
      [
        "# Sugestão de autor pela foto da diretoria (para religar depois)",
        "",
        "Arquivo gerado por `npm run migracao:posts` (fora do Git). A foto do autor no site antigo é só a de alguém da diretoria, então a `sugestaoDeAutor` do post fica vazia (resposta 3 de 22/10/2026). O cargo é a chave da diretoria no mapa (`origem.chave` em `diretoria`, depois da importação).",
        "",
        "| Slug antigo | Slug novo | Cargo |",
        "|---|---|---|",
        ...pelaDiretoria.map((item) => `| ${item.slugAntigo} | ${item.slugNovo} | ${item.cargos.join(", ")} |`),
        "",
      ].join("\n"),
      { mode: 0o600 },
    );

    const c = relatorio.contagens;
    console.log(`\nPosts: ${c.previstos} previstos; ${c.jaExistentes} já existentes; ${c.nestaExecucao} nesta execução; ${c.criados} criados`);
    console.log(`Idioma: ${JSON.stringify(c.porIdioma)}; status dos novos: ${JSON.stringify(c.porStatus)}`);
    console.log(`Capas: ${c.capas.noArquivo} no arquivo, ${c.capas.ligaveisAgora} ligáveis agora; imagens do corpo: ${c.imagensDoCorpo.noMarkdown} (${c.imagensDoCorpo.ligaveisAgora} ligáveis agora)`);
    console.log(`Resumo: ${JSON.stringify(c.resumoPorFonte)}; colisões de slug: ${c.colisoesDeSlug}; com endereço do Wix: ${c.comEnderecoDoWix}`);
    if (relatorio.colisoes.length) console.log("COLISÕES DE SLUG: veja o relatório. A execução real será recusada.");
    console.log(`Relatório: ${caminhos.md}`);
    console.log(`Sugestão de autor pela foto da diretoria: ${pelaDiretoria.length} post(s), em ${SUGESTOES_DA_DIRETORIA}`);
    console.log(`Redirecionamentos (NÃO ativados): ${REDIRECTS} (${tabela.entradas.length} no total)`);
  } finally {
    liberarTrava?.();
  }
}

principal().then(
  () => process.exit(0),
  (erro) => parar(`Falha na migração: ${erro instanceof Error ? erro.message : String(erro)}`),
);
