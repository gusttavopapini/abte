// As ações de servidor dos tópicos não rodam fora do Next.js (dependem do
// cookie da sessão); este teste lê o código e confere que TODAS começam por
// exigirPapelDoPainel(), que recusa sem sessão (vai para o login) e sem papel
// (erro antes de ler ou gravar). A decisão em si está em
// decidirAcessoAoPainel, testada aqui também.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { decidirAcessoAoPainel } from "../../src/lib/auth/papeis.ts";

describe("Ações dos tópicos: sessão e papel", () => {
  test("toda ação exportada começa por exigirPapelDoPainel()", () => {
    const codigo = readFileSync("src/app/admin/acoes-topicos.ts", "utf8");
    const acoes = [...codigo.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{\s*([^\n]*)/g)].map(([, nome, primeira]) => ({ nome, primeira }));
    assert.deepEqual(acoes.map((acao) => acao.nome), ["criarTopico", "atualizarTopico", "moverTopicoParaALixeira", "restaurarTopicoDaLixeira"]);
    const esperado: Record<string, RegExp> = {
      criarTopico: /^const usuario = await exigirPapelDoPainel\("conteudo\.editar"\);$/,
      atualizarTopico: /^const usuario = await exigirPapelDoPainel\("conteudo\.editar"\);$/,
      moverTopicoParaALixeira: /^return marcarPeloMenu\("conteudo\.excluir", tipo, id\);$/,
      restaurarTopicoDaLixeira: /^return marcarPeloMenu\("conteudo\.restaurar", tipo, id\);$/,
    };
    for (const acao of acoes) assert.match(acao.primeira, esperado[acao.nome], acao.nome);
    // marcarPeloMenu: sessão e papel, depois a permissão, depois o tipo e o id.
    const corpo = codigo.match(/async function marcarPeloMenu\([\s\S]*?\{([\s\S]*?)\n\}/)?.[1] ?? "";
    const linhas = corpo.trim().split("\n").map((linha) => linha.trim());
    assert.equal(linhas[0], "const usuario = await exigirPapelDoPainel();");
    assert.match(linhas[1], /^if \(!papelPodeExecutar\(usuario\.papel, acao\)\) return/);
    assert.match(linhas[2], /^if \(!ehTipoDeTopico\(tipo\) \|\| !ehIdDeDocumentoValido\(id\)\) return/);
  });

  test("sem sessão ou sem papel, recusa; editor e administrador passam", () => {
    assert.deepEqual(decidirAcessoAoPainel(null), { permitido: false, motivo: "sem-sessao" });
    assert.deepEqual(decidirAcessoAoPainel({}), { permitido: false, motivo: "sem-papel" });
    assert.deepEqual(decidirAcessoAoPainel({ papel: "editor" }), { permitido: true, papel: "editor" });
    assert.deepEqual(decidirAcessoAoPainel({ papel: "administrador" }), { permitido: true, papel: "administrador" });
  });
});
