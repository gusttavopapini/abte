"use server";

// Ações de servidor dos tópicos: categorias e tags dos artigos e dos posts
// (25/10/2026) e categorias de produto da loja. Validam o formulário e chamam lib/gravacao/topicos.ts,
// que grava (e, nas categorias de artigo, registra em logAlteracoes na mesma
// transação, desde 23/10/2026).
// Toda ação começa por exigirPapelDoPainel(): sem papel, nada é lido nem gravado.
// As respostas trazem a mensagem para a tela, sempre em português.
import { revalidatePath } from "next/cache";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { autorDaAlteracao, exigirPapelDoPainel } from "@/lib/auth/sessao";
import type { TipoDeTopico } from "@/lib/dados/tipos";
import { gerarSlug } from "@/lib/slug";
import { atualizarTopico as atualizarNoBanco, criarTopico as criarNoBanco, marcarExclusaoDoTopico, temCampoAtiva } from "@/lib/gravacao/topicos";
import { lerIdDaMidiaEscolhida } from "@/lib/midia/regras";
import { lerAtivaDoFormulario } from "@/lib/topicos";
import { ehIdDeDocumentoValido, lerInteiroDoFormulario, lerTextoDoFormulario } from "@/lib/validacao";

export type RespostaDoTopico = { ok: boolean; mensagem: string };

const LIMITE_NOME_TOPICO = 60;
const ORDEM_MAXIMA = 999;

// Mensagem de erro de validação (lançada por nós, em português) ou genérica.
class ErroDeValidacao extends Error {}

function lerTipo(dados: FormData): TipoDeTopico {
  const tipo = dados.get("tipo");
  if (tipo === "categoria" || tipo === "tag" || tipo === "categoriaDePost" || tipo === "tagDePost" || tipo === "categoriaDeProduto") return tipo;
  throw new ErroDeValidacao("Tipo de tópico desconhecido.");
}

function lerId(dados: FormData): string {
  const id = dados.get("id");
  if (!ehIdDeDocumentoValido(id)) throw new ErroDeValidacao("Tópico não encontrado.");
  return id;
}

function lerNome(dados: FormData): string {
  let nome: string;
  try {
    nome = lerTextoDoFormulario(dados, "nome", { rotulo: "Nome", limite: LIMITE_NOME_TOPICO }).trim();
  } catch (erro) {
    throw new ErroDeValidacao(erro instanceof Error ? erro.message : "Nome inválido.");
  }
  if (!nome) throw new ErroDeValidacao("Preencha o nome.");
  if (!gerarSlug(nome)) throw new ErroDeValidacao("O nome precisa ter pelo menos uma letra ou um número.");
  return nome;
}

function lerOrdem(dados: FormData): number {
  try {
    return lerInteiroDoFormulario(dados, "ordem", { rotulo: "Ordem", minimo: 0, maximo: ORDEM_MAXIMA, padrao: 0 });
  } catch (erro) {
    throw new ErroDeValidacao(erro instanceof Error ? erro.message : "Ordem inválida.");
  }
}

// Só as categorias de artigos e de produtos têm imagem; tags e categorias de
// post não.
function temImagem(tipo: TipoDeTopico): boolean {
  return tipo === "categoria" || tipo === "categoriaDeProduto";
}

// Imagem da categoria (campo escondido do seletor de mídia): vazio vira null.
function lerImagem(dados: FormData): string | null {
  const imagem = lerIdDaMidiaEscolhida(dados.get("imagemMidiaId"));
  if (!imagem.ok) throw new ErroDeValidacao("Imagem inválida. Escolha a imagem de novo.");
  return imagem.id;
}

// Converte qualquer falha em resposta para a tela, sem expor detalhe técnico.
function respostaDeErro(erro: unknown): RespostaDoTopico {
  if (erro instanceof ErroDeValidacao) return { ok: false, mensagem: erro.message };
  console.error("Falha ao gravar tópico de artigo:", erro);
  return { ok: false, mensagem: "Não foi possível salvar agora. Tente de novo em instantes." };
}

function atualizarPaginas() {
  revalidatePath("/admin/artigos/topicos");
  revalidatePath("/admin/artigos");
  revalidatePath("/artigos");
  revalidatePath("/artigos/categoria/[slug]", "page");
  revalidatePath("/artigos/[slug]", "page");
  revalidatePath("/admin/blog/topicos");
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/admin/loja/categorias");
  revalidatePath("/loja");
  revalidatePath("/admin/midia");
}

export async function criarTopico(_anterior: RespostaDoTopico | null, dados: FormData): Promise<RespostaDoTopico> {
  const usuario = await exigirPapelDoPainel();
  try {
    const tipo = lerTipo(dados);
    const resultado = await criarNoBanco(firestoreAdmin(), tipo, { nome: lerNome(dados), ordem: lerOrdem(dados) }, autorDaAlteracao(usuario));
    if (!resultado.ok) return resultado;
    atualizarPaginas();
    return { ok: true, mensagem: resultado.mensagem };
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

// Renomeia, muda a ordem e, nas categorias, a imagem; nas categorias de
// artigo e de post, também o campo ativa (desde 23/10 e 25/10/2026). O slug não muda, para os
// endereços continuarem valendo.
export async function atualizarTopico(_anterior: RespostaDoTopico | null, dados: FormData): Promise<RespostaDoTopico> {
  const usuario = await exigirPapelDoPainel();
  try {
    const tipo = lerTipo(dados);
    const id = lerId(dados);
    const nome = lerNome(dados);
    const ordem = lerOrdem(dados);
    // Tags não têm imagem: o campo nem é gravado. Nas categorias, só quando o
    // formulário traz o campo (sem ele, a imagem gravada fica como está).
    const imagemMidiaId = temImagem(tipo) && dados.has("imagemMidiaId") ? lerImagem(dados) : undefined;
    // Ativa: só nas categorias de artigo e de post, e só quando o formulário
    // traz o controle.
    let ativa: boolean | undefined;
    if (temCampoAtiva(tipo)) {
      const lida = lerAtivaDoFormulario(dados);
      if (!lida.ok) throw new ErroDeValidacao(lida.mensagem);
      if (lida.ativa !== null) ativa = lida.ativa;
    }
    const resultado = await atualizarNoBanco(firestoreAdmin(), tipo, id, { nome, ordem, imagemMidiaId, ativa }, autorDaAlteracao(usuario));
    if (!resultado.ok) return resultado;
    atualizarPaginas();
    return { ok: true, mensagem: "Alterações salvas." };
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

// Manda para a lixeira (excluidoEm). Tópico usado por algum artigo não sai:
// antes é preciso trocar o tópico desses artigos.
export async function excluirTopico(_anterior: RespostaDoTopico | null, dados: FormData): Promise<RespostaDoTopico> {
  const usuario = await exigirPapelDoPainel();
  try {
    const resultado = await marcarExclusaoDoTopico(firestoreAdmin(), lerTipo(dados), lerId(dados), true, autorDaAlteracao(usuario));
    if (!resultado.ok) return resultado;
    atualizarPaginas();
    return { ok: true, mensagem: `"${resultado.nome}" foi para os excluídos. Dá para restaurar abaixo.` };
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

// Tira da lixeira. Se outro tópico ativo já usa o mesmo nome, recusa.
export async function restaurarTopico(_anterior: RespostaDoTopico | null, dados: FormData): Promise<RespostaDoTopico> {
  const usuario = await exigirPapelDoPainel();
  try {
    const resultado = await marcarExclusaoDoTopico(firestoreAdmin(), lerTipo(dados), lerId(dados), false, autorDaAlteracao(usuario));
    if (!resultado.ok) return resultado;
    atualizarPaginas();
    return { ok: true, mensagem: `"${resultado.nome}" foi restaurado.` };
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
