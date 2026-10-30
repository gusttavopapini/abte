// Testes das regras do Cloud Storage, rodando no emulador (npm run test:regras).
// Confirmam que o navegador só consegue abrir um arquivo exato em publico/:
// não lista pastas, não lê a lixeira nem outros caminhos e nunca grava nem
// apaga nada, nem mesmo quem tem papel no painel (os envios passam pelo
// servidor, com o Admin SDK).
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

// Projeto "demo-": o emulador não conversa com nenhum projeto real.
const PROJETO = "demo-abte-regras";

// Arquivos criados sem regras antes de cada teste.
const PUBLICO = "publico/midias/exemplo/960.webp";
const NA_LIXEIRA = "lixeira/midias/exemplo/960.webp";
const FORA_DO_PUBLICO = "privado/exemplo.webp";
const NA_RAIZ = "exemplo.webp";
const ARQUIVOS = [PUBLICO, NA_LIXEIRA, FORA_DO_PUBLICO, NA_RAIZ];

const BYTES = new Uint8Array([1, 2, 3, 4]);
const METADADOS = { contentType: "image/webp" };

// O envio devolve um UploadTask, que só tem "then"; ".then()" o transforma em promessa.
function enviar(contexto: RulesTestContext, caminho: string) {
  return contexto.storage().ref(caminho).put(BYTES, METADADOS).then();
}

let ambiente: RulesTestEnvironment;

before(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: PROJETO,
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });
});

after(async () => {
  await ambiente.cleanup();
});

beforeEach(async () => {
  await ambiente.clearStorage();
  await ambiente.withSecurityRulesDisabled(async (contexto) => {
    for (const caminho of ARQUIVOS) await enviar(contexto, caminho);
  });
});

function testarAcesso(descricao: string, obterContexto: () => RulesTestContext) {
  describe(descricao, () => {
    test("abre um arquivo exato em publico/", async () => {
      const arquivo = obterContexto().storage().ref(PUBLICO);
      await assertSucceeds(arquivo.getMetadata());
      await assertSucceeds(arquivo.getDownloadURL());
    });

    test("não lista o conteúdo de publico/ nem da raiz", async () => {
      const storage = obterContexto().storage();
      await assertFails(storage.ref("publico/midias/exemplo").listAll());
      await assertFails(storage.ref("publico").listAll());
      await assertFails(storage.ref().listAll());
    });

    test("não lê a lixeira, outros caminhos nem a raiz", async () => {
      const storage = obterContexto().storage();
      for (const caminho of [NA_LIXEIRA, FORA_DO_PUBLICO, NA_RAIZ]) {
        await assertFails(storage.ref(caminho).getMetadata());
        await assertFails(storage.ref(caminho).getDownloadURL());
      }
    });

    test("não grava arquivo novo em nenhum caminho", async () => {
      const contexto = obterContexto();
      // publico/videos (vídeo de "Quem Somos", 30/10/2026): o navegador só
      // envia pela política assinada do servidor, nunca pelas regras.
      for (const caminho of ["publico/midias/novo/960.webp", "publico/videos/abcdefghij0123456789/video.mp4", "lixeira/novo.webp", "privado/novo.webp", "novo.webp"]) {
        await assertFails(enviar(contexto, caminho));
      }
    });

    test("não substitui, não altera metadados e não apaga arquivos existentes", async () => {
      const contexto = obterContexto();
      const storage = contexto.storage();
      for (const caminho of ARQUIVOS) {
        await assertFails(enviar(contexto, caminho));
        await assertFails(storage.ref(caminho).updateMetadata({ cacheControl: "no-store" }));
        await assertFails(storage.ref(caminho).delete());
      }
    });
  });
}

testarAcesso("Visitante sem login", () => ambiente.unauthenticatedContext());
testarAcesso("Usuário logado sem papel", () => ambiente.authenticatedContext("usuario-sem-papel"));
testarAcesso("Usuário com papel administrador (pelo navegador)", () =>
  ambiente.authenticatedContext("usuario-admin", { papel: "administrador" }),
);
testarAcesso("Usuário com papel editor (pelo navegador)", () =>
  ambiente.authenticatedContext("usuario-editor", { papel: "editor" }),
);
