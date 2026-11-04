// As ações de servidor comuns ao conteúdo (04/11/2026) não rodam fora do
// Next.js; este teste lê o código e confere que TODA ação exportada passa
// por preparar() com a permissão certa, e que preparar() começa por
// exigirPapelDoPainel() e confere a tabela PERMISSOES antes de ler ou gravar.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const codigo = readFileSync("src/app/admin/acoes-lixeira.ts", "utf8");

describe("Ações comuns de conteúdo: sessão, papel e permissão", () => {
  test("cada ação usa a permissão certa da tabela", () => {
    const acoes = Object.fromEntries([...codigo.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{\s*([^\n]*)/g)].map(([, nome, primeira]) => [nome, primeira]));
    assert.deepEqual(Object.keys(acoes), ["publicarOuDespublicar", "moverItemParaALixeira", "restaurarItemDaLixeira", "excluirItemDeVez", "duplicarItem", "aplicarAcaoEmLote"]);
    const esperado: Record<string, string> = {
      publicarOuDespublicar: "conteudo.publicar",
      moverItemParaALixeira: "conteudo.excluir",
      restaurarItemDaLixeira: "conteudo.restaurar",
      excluirItemDeVez: "conteudo.excluirDeVez",
      duplicarItem: "conteudo.editar",
    };
    for (const [nome, primeira] of Object.entries(acoes)) {
      if (nome === "aplicarAcaoEmLote") continue;
      assert.equal(primeira, `const preparo = await preparar("${esperado[nome]}", colecao, id);`, nome);
    }
  });

  test("preparar() exige sessão e papel, confere a permissão e só depois a coleção e o id", () => {
    const corpo = codigo.match(/async function preparar\([^)]*\)[^{]*\{([\s\S]*?)\n\}/)?.[1] ?? "";
    const linhas = corpo.trim().split("\n").map((linha) => linha.trim());
    assert.equal(linhas[0], "const usuario = await exigirPapelDoPainel();");
    assert.match(linhas[1], /^if \(!papelPodeExecutar\(usuario\.papel, acao\)\) return/);
    assert.match(linhas[2], /^if \(!ehColecaoDoPainel\(colecao\) \|\| !ehIdDeDocumentoValido\(id\)\) return/);
  });

  test("duplicar só grava depois de conferir o preparo", () => {
    const corpo = codigo.match(/export async function duplicarItem[\s\S]*?\n\}/)?.[0] ?? "";
    assert.ok(corpo.indexOf("if (!preparo.ok) return preparo.resposta;") < corpo.indexOf("duplicarPost("));
  });
});

describe("Ação em lote: sessão, papel e permissão", () => {
  test("começa por exigirPapelDoPainel(), confere a ação e a permissão antes da seleção e de gravar", () => {
    const corpo = codigo.match(/export async function aplicarAcaoEmLote[\s\S]*?\n\}/)?.[0] ?? "";
    const linhas = corpo.split("\n").slice(1).map((linha) => linha.trim());
    assert.equal(linhas[0], "const usuario = await exigirPapelDoPainel();");
    assert.match(linhas[1], /^if \(!ehAcaoEmLote\(acao\)\) return/);
    assert.match(linhas[2], /^if \(!papelPodeExecutar\(usuario\.papel, PERMISSAO_DO_LOTE\[acao\]\)\) return/);
    assert.ok(corpo.indexOf("lerIdsDoLote(") < corpo.indexOf("aplicarEmLote("));
    assert.match(codigo, /const PERMISSAO_DO_LOTE: Record<AcaoEmLote, AcaoDoPainel> = \{ despublicar: "conteudo\.publicar", lixeira: "conteudo\.excluir", restaurar: "conteudo\.restaurar" \};/);
  });
});
