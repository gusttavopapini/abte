// Conferência da biblioteca de mídia: pastas no Storage sem documento em
// "midias" (órfãs) e documentos com arquivos faltando.
//
// Uso:
//   npm run midia:orfas                       só lista (padrão)
//   npm run midia:orfas -- --apagar --confirmo-projeto=<id do projeto exibido>
//
// Por padrão SÓ LISTA. Apagar exige --apagar E --confirmo-projeto com o id do
// projeto mostrado no início; sem os dois, nada é apagado. Apaga apenas os
// arquivos das pastas órfãs, nunca documentos. Pastas com arquivo criado há
// menos de 60 minutos ficam de fora (podem ser um envio em andamento); para
// mudar, --minutos=N.
//
// Desde 29/10/2026 também lista (só lista, nunca apaga) as imagens enviadas
// pelo formulário de um item (campo "dono", src/lib/midia/dono.ts) que o
// item não chegou a usar: cadastro novo que não foi salvo (dono sem id) ou
// item salvo sem a imagem. Para tirá-las, use a lixeira em /admin/midia.
//
// Lê as credenciais do .env e do .env.local (o .env.local prevalece) e nunca
// as exibe. Com FIRESTORE_EMULATOR_HOST e FIREBASE_STORAGE_EMULATOR_HOST
// definidas, usa os emuladores (testes).
import { cert, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// Mesmos nomes de src/lib/midia/biblioteca.ts e regras.ts (o script não
// importa a biblioteca, que carrega o sharp).
const COLECAO_MIDIAS = "midias";
const PASTAS = ["publico", "lixeira"] as const;
const MINUTOS_PADRAO = 60;

type Pasta = { caminho: string; id: string; arquivos: string[]; maisRecente: number };

// Onde o item dono guarda a imagem (mesmas referências de
// REFERENCIAS_DE_MIDIA em src/lib/midia/biblioteca.ts e da home).
// Na home, chaveDaImagem diz qual versão (30/10/2026): midiaId (computador)
// ou midiaMobileId (celular).
const ONDE_O_DONO_USA: Record<string, { colecao: string; campo: string; jeito: "id" | "lista" | "texto" | "home" | "objetoDaHome"; chaveDaImagem?: "midiaId" | "midiaMobileId" | "midiaTabletId" }> = {
  "post:capa": { colecao: "posts", campo: "capaMidiaId", jeito: "id" },
  "post:corpo": { colecao: "posts", campo: "conteudo", jeito: "texto" },
  "artigo:imagem": { colecao: "artigos", campo: "imagemMidiaId", jeito: "id" },
  "produto:galeria": { colecao: "produtos", campo: "imagens", jeito: "lista" },
  "profissional:foto": { colecao: "profissionais", campo: "fotoMidiaId", jeito: "id" },
  "categoriaDeArtigo:imagem": { colecao: "categoriasDeArtigos", campo: "imagemMidiaId", jeito: "id" },
  "categoriaDeProduto:imagem": { colecao: "categoriasDeProdutos", campo: "imagemMidiaId", jeito: "id" },
  "diretoria:foto": { colecao: "diretoria", campo: "fotoMidiaId", jeito: "id" },
  "home:banner": { colecao: "configuracoes", campo: "banners", jeito: "home", chaveDaImagem: "midiaId" },
  "home:bannerCelular": { colecao: "configuracoes", campo: "banners", jeito: "home", chaveDaImagem: "midiaMobileId" },
  "home:bannerTablet": { colecao: "configuracoes", campo: "banners", jeito: "home", chaveDaImagem: "midiaTabletId" },
  "home:secao": { colecao: "configuracoes", campo: "imagens", jeito: "home", chaveDaImagem: "midiaId" },
  "home:secaoCelular": { colecao: "configuracoes", campo: "imagens", jeito: "home", chaveDaImagem: "midiaMobileId" },
  "home:videoCapa": { colecao: "configuracoes", campo: "videoQuemSomos", jeito: "objetoDaHome" },
};

// O item dono usa a imagem? Na home, o documento é configuracoes/home.
async function donoUsa(db: ReturnType<typeof getFirestore>, midiaId: string, dono: { tipo: string; id: string; campo: string }): Promise<boolean> {
  const onde = ONDE_O_DONO_USA[`${dono.tipo}:${dono.campo}`];
  if (!onde) return false;
  const documento = await db.collection(onde.colecao).doc(onde.jeito === "home" || onde.jeito === "objetoDaHome" ? "home" : dono.id).get();
  if (!documento.exists) return false;
  const valor = documento.get(onde.campo);
  if (onde.jeito === "id") return valor === midiaId;
  if (onde.jeito === "texto") return String(valor ?? "").includes(`](midia:${midiaId})`);
  if (onde.jeito === "lista") return Array.isArray(valor) && valor.some((item) => item?.midiaId === midiaId);
  if (onde.jeito === "objetoDaHome") return (valor as { capaMidiaId?: unknown } | null)?.capaMidiaId === midiaId;
  const lista = Array.isArray(valor) ? valor : Object.values(valor ?? {});
  const chave = onde.chaveDaImagem ?? "midiaId";
  return lista.some((item) => (item as Record<string, unknown> | null)?.[chave] === midiaId);
}

function argumento(nome: string): string | null {
  const encontrado = process.argv.slice(2).find((arg) => arg === nome || arg.startsWith(`${nome}=`));
  if (!encontrado) return null;
  return encontrado.includes("=") ? encontrado.slice(encontrado.indexOf("=") + 1) : "";
}

function iniciar(projectId: string): App {
  const emFirestore = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  const emStorage = Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
  if (emFirestore !== emStorage) {
    console.error("Defina as duas variáveis de emulador (Firestore e Storage) ou nenhuma. Nada foi feito.");
    process.exit(1);
  }
  if (emFirestore) return initializeApp({ projectId }, "midia-orfas");
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    console.error("Credenciais do Admin SDK ausentes no .env.local (FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY).");
    process.exit(1);
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "midia-orfas");
}

async function principal() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const nomeDoBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!projectId || !nomeDoBucket) {
    console.error("Preencha FIREBASE_ADMIN_PROJECT_ID e NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET no .env.local. Nada foi feito.");
    process.exit(1);
  }
  const apagar = argumento("--apagar") !== null;
  const confirmacao = argumento("--confirmo-projeto");
  const textoMinutos = argumento("--minutos");
  const minutos = textoMinutos === null ? MINUTOS_PADRAO : Number(textoMinutos);
  if (!Number.isInteger(minutos) || minutos < 0) {
    console.error("--minutos precisa ser um número inteiro de 0 para cima. Nada foi feito.");
    process.exit(1);
  }

  const emulador = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
  console.log(`Projeto: ${projectId}${emulador ? " (emuladores)" : ""}`);
  console.log(`Bucket: ${nomeDoBucket}`);
  console.log(apagar ? "Modo: apagar pastas órfãs" : "Modo: só listar");

  const app = iniciar(projectId);
  const db = getFirestore(app);
  const bucket = getStorage(app).bucket(nomeDoBucket);

  // Pastas no Storage: {pasta}/midias/{id}/{largura}.webp
  const pastas = new Map<string, Pasta>();
  const existentes = new Set<string>();
  for (const pasta of PASTAS) {
    const [arquivos] = await bucket.getFiles({ prefix: `${pasta}/midias/` });
    for (const arquivo of arquivos) {
      existentes.add(arquivo.name);
      const partes = arquivo.name.split("/");
      if (partes.length < 4) continue;
      const caminho = partes.slice(0, 3).join("/");
      const criadoEm = Date.parse(String(arquivo.metadata.timeCreated ?? "")) || Date.now();
      const atual = pastas.get(caminho) ?? { caminho, id: partes[2], arquivos: [], maisRecente: 0 };
      atual.arquivos.push(arquivo.name);
      atual.maisRecente = Math.max(atual.maisRecente, criadoEm);
      pastas.set(caminho, atual);
    }
  }

  const documentos = await db.collection(COLECAO_MIDIAS).get();
  const ids = new Set(documentos.docs.map((documento) => documento.id));

  const limite = Date.now() - minutos * 60 * 1000;
  const orfas = [...pastas.values()].filter((pasta) => !ids.has(pasta.id));
  const paraApagar = orfas.filter((pasta) => pasta.maisRecente <= limite);
  const recentes = orfas.filter((pasta) => pasta.maisRecente > limite);

  console.log(`\nPastas sem documento: ${orfas.length}`);
  for (const pasta of paraApagar) console.log(`  ${pasta.caminho} (${pasta.arquivos.length} arquivo(s))`);
  for (const pasta of recentes) console.log(`  ${pasta.caminho} (${pasta.arquivos.length} arquivo(s), criada há menos de ${minutos} minutos, ignorada)`);

  const semArquivo: string[] = [];
  for (const documento of documentos.docs) {
    const variantes = documento.get("variantes");
    const caminhos = Array.isArray(variantes) ? variantes.map((variante) => String(variante?.caminho ?? "")) : [];
    const faltando = caminhos.filter((caminho) => !existentes.has(caminho));
    if (faltando.length > 0) semArquivo.push(`  ${documento.id}: ${faltando.length} de ${caminhos.length} arquivo(s) faltando`);
  }
  console.log(`\nDocumentos com arquivo faltando: ${semArquivo.length}`);
  for (const linha of semArquivo) console.log(linha);
  if (semArquivo.length > 0) console.log("  (documentos nunca são apagados por este script; confira no painel)");

  // Enviadas pelo formulário de um item e não usadas por ele (só as fora da
  // lixeira e criadas antes do limite de minutos).
  const naoSalvas: string[] = [];
  for (const documento of documentos.docs) {
    const dono = documento.get("dono");
    if (!dono || typeof dono !== "object" || documento.get("excluidoEm")) continue;
    const criadoEm = documento.get("criadoEm")?.toMillis?.() ?? 0;
    if (criadoEm > limite) continue;
    const { tipo, id, campo } = dono as Record<string, unknown>;
    if (typeof tipo !== "string" || typeof campo !== "string") continue;
    if (typeof id !== "string" || !id) naoSalvas.push(`  ${documento.id}: ${tipo} (${campo}), cadastro não salvo`);
    else if (!(await donoUsa(db, documento.id, { tipo, id, campo }))) naoSalvas.push(`  ${documento.id}: ${tipo} (${campo}), não usada pelo item`);
  }
  console.log(`\nEnviadas por um item e não usadas por ele: ${naoSalvas.length}`);
  for (const linha of naoSalvas) console.log(linha);
  if (naoSalvas.length > 0) console.log("  (só listadas; para tirá-las, use a lixeira em /admin/midia)");

  if (!apagar) return;
  if (confirmacao !== projectId) {
    console.error(`\nNada foi apagado: para apagar, repita com --apagar --confirmo-projeto=${projectId}`);
    process.exit(1);
  }
  let apagados = 0;
  for (const pasta of paraApagar) {
    for (const nome of pasta.arquivos) {
      await bucket.file(nome).delete({ ignoreNotFound: true });
      apagados++;
    }
  }
  console.log(`\nApagados: ${apagados} arquivo(s) de ${paraApagar.length} pasta(s) órfã(s).`);
}

principal().then(
  () => process.exit(0),
  (erro) => {
    console.error("Falha na conferência:", erro instanceof Error ? erro.message : String(erro));
    process.exit(1);
  },
);
