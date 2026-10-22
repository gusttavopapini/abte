// Testes do cliente de rede da migração (npm run test:unidade) contra um
// servidor HTTP local (127.0.0.1), sem internet: mesma origem, limite de
// redirecionamentos, novas tentativas só em 5xx, bloqueio em 403 e 429,
// limite de tamanho, tempo limite e pausa entre pedidos. As esperas ficam em
// milissegundos para o teste ser rápido.
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import { ErroDeRede, caminhoSeguro, criarClienteDeRede, type ConfiguracaoDaRede } from "../../src/lib/migracao/rede.ts";

let servidor: Server;
let origem: string;
const visitas = new Map<string, number>();
const agentes: string[] = [];
const horarios: number[] = [];

function responder(pedido: IncomingMessage, resposta: ServerResponse) {
  const caminho = pedido.url ?? "/";
  visitas.set(caminho, (visitas.get(caminho) ?? 0) + 1);
  agentes.push(String(pedido.headers["user-agent"]));
  horarios.push(Date.now());
  const rotas: Record<string, () => void> = {
    "/ok": () => resposta.writeHead(200, { "content-type": "image/jpeg" }).end(Buffer.from([1, 2, 3])),
    "/redireciona": () => resposta.writeHead(301, { location: "/ok" }).end(),
    "/fora": () => resposta.writeHead(302, { location: "https://exemplo.invalid/ok" }).end(),
    "/sem-destino": () => resposta.writeHead(302).end(),
    "/r1": () => resposta.writeHead(302, { location: "/r2" }).end(),
    "/r2": () => resposta.writeHead(302, { location: "/r3" }).end(),
    "/r3": () => resposta.writeHead(302, { location: "/r4" }).end(),
    "/r4": () => resposta.writeHead(302, { location: "/ok" }).end(),
    "/sumiu": () => resposta.writeHead(404).end(),
    "/proibido": () => resposta.writeHead(403).end(),
    "/devagar-demais": () => resposta.writeHead(429).end(),
    "/quebrado": () => resposta.writeHead(503).end(),
    "/grande-informado": () => resposta.writeHead(200, { "content-length": "2000" }).end(Buffer.alloc(2000)),
    "/grande-sem-tamanho": () => {
      resposta.writeHead(200);
      resposta.write(Buffer.alloc(600));
      resposta.end(Buffer.alloc(600));
    },
    "/lento": () => setTimeout(() => resposta.writeHead(200).end("x"), 300),
  };
  (rotas[caminho] ?? (() => resposta.writeHead(418).end()))();
}

before(async () => {
  servidor = createServer(responder);
  await new Promise<void>((pronto) => servidor.listen(0, "127.0.0.1", pronto));
  origem = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

after(async () => {
  servidor.closeAllConnections();
  await new Promise<void>((fechado) => servidor.close(() => fechado()));
});

function cliente(config: Partial<ConfiguracaoDaRede> = {}) {
  return criarClienteDeRede({ origem, permitirHttpLocal: true, pausaMinimaMs: 0, esperasEntreTentativasMs: [1], ...config });
}

async function falha(promessa: Promise<unknown>): Promise<ErroDeRede> {
  try {
    await promessa;
  } catch (erro) {
    assert.ok(erro instanceof ErroDeRede, String(erro));
    return erro;
  }
  assert.fail("devia falhar");
}

describe("Cliente de rede da migração", () => {
  test("baixa da origem fixa, com o User-Agent da ABTE", async () => {
    const resposta = await cliente().baixar("/ok");
    assert.deepEqual([...resposta.bytes], [1, 2, 3]);
    assert.equal(resposta.tipoInformado, "image/jpeg");
    assert.match(agentes.at(-1) ?? "", /^ABTE-migracao\//);
  });

  test("só HTTPS: http de verdade é recusado sem a opção dos testes", () => {
    assert.throws(() => criarClienteDeRede({ origem }), /HTTPS/);
    assert.throws(() => criarClienteDeRede({ origem: "http://exemplo.invalid", permitirHttpLocal: true }), /HTTPS/);
    assert.throws(() => criarClienteDeRede({ origem: "https://static.wixstatic.com/media" }), /caminho/);
    assert.doesNotThrow(() => criarClienteDeRede({ origem: "https://static.wixstatic.com" }));
  });

  test("caminho que poderia trocar de servidor é recusado antes de qualquer pedido", async () => {
    for (const caminho of ["//exemplo.invalid/x", "https://exemplo.invalid/x", "x", "/a/../b", "/a b", "/a\\b", "/a#b"]) {
      assert.equal(caminhoSeguro(caminho), false, caminho);
      assert.equal((await falha(cliente().baixar(caminho))).tipo, "endereco", caminho);
    }
    assert.ok(caminhoSeguro("/media/7dce06_abc~mv2.jpg"));
  });

  test("redirecionamento na mesma origem é seguido; para outro servidor, recusado", async () => {
    assert.deepEqual([...(await cliente().baixar("/redireciona")).bytes], [1, 2, 3]);
    assert.equal((await falha(cliente().baixar("/fora"))).tipo, "redirecionamento");
    assert.equal((await falha(cliente().baixar("/sem-destino"))).tipo, "redirecionamento");
  });

  test("no máximo 3 redirecionamentos", async () => {
    assert.equal((await falha(cliente().baixar("/r1"))).tipo, "redirecionamento");
    assert.deepEqual([...(await cliente().baixar("/r2")).bytes], [1, 2, 3]);
  });

  test("404 não tenta de novo; 5xx tenta mais 2 vezes", async () => {
    visitas.clear();
    assert.equal((await falha(cliente().baixar("/sumiu"))).tipo, "naoEncontrado");
    assert.equal(visitas.get("/sumiu"), 1);
    const erro = await falha(cliente().baixar("/quebrado"));
    assert.equal(erro.tipo, "servidor");
    assert.equal(erro.status, 503);
    assert.equal(visitas.get("/quebrado"), 3);
  });

  test("403 e 429 são bloqueio, sem nova tentativa", async () => {
    visitas.clear();
    assert.equal((await falha(cliente().baixar("/proibido"))).tipo, "bloqueio");
    assert.equal((await falha(cliente().baixar("/devagar-demais"))).tipo, "bloqueio");
    assert.equal(visitas.get("/proibido"), 1);
    assert.equal(visitas.get("/devagar-demais"), 1);
  });

  test("corta o download acima do limite (pelo tamanho informado e durante a leitura)", async () => {
    assert.equal((await falha(cliente({ limiteDeBytes: 1000 }).baixar("/grande-informado"))).tipo, "grande");
    assert.equal((await falha(cliente({ limiteDeBytes: 1000 }).baixar("/grande-sem-tamanho"))).tipo, "grande");
    assert.equal((await cliente({ limiteDeBytes: 1200 }).baixar("/grande-sem-tamanho")).bytes.length, 1200);
  });

  test("tempo limite vira erro de tempo, sem nova tentativa", async () => {
    visitas.clear();
    assert.equal((await falha(cliente({ tempoLimiteMs: 50 }).baixar("/lento"))).tipo, "tempo");
    assert.equal(visitas.get("/lento"), 1);
  });

  test("pausa mínima entre pedidos, inclusive nos redirecionamentos", async () => {
    horarios.length = 0;
    const rede = cliente({ pausaMinimaMs: 120 });
    await rede.baixar("/ok");
    await rede.baixar("/redireciona");
    assert.equal(rede.pedidos, 3);
    for (let i = 1; i < horarios.length; i++) assert.ok(horarios[i] - horarios[i - 1] >= 100, `intervalo ${horarios[i] - horarios[i - 1]} ms`);
  });
});
