import type { Metadata } from "next";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { papelPodeExecutar } from "@/lib/auth/papeis";
import { lerMidias } from "@/lib/dados/colecoes";
import type { Midia } from "@/lib/dados/tipos";
import { midiaNaTela } from "@/lib/midia/exibicao";
import { servicosDeMidia } from "@/lib/midia/servicos";
import type { MidiaNaTela } from "@/lib/midia/tela";
import { MidiaAdminClient } from "./MidiaAdminClient";

export const metadata: Metadata = { title: "Mídia" };

// Prévias da lixeira: os arquivos não são públicos, então o servidor gera um
// endereço assinado de leitura, válido por uma hora, só da menor variante.
const VALIDADE_DA_PREVIA_MS = 60 * 60 * 1000;

async function previaDaLixeira(midia: Midia): Promise<MidiaNaTela> {
  const menor = [...midia.variantes].sort((a, b) => a.largura - b.largura)[0];
  if (!menor) return midiaNaTela(midia, []);
  try {
    const [url] = await servicosDeMidia()
      .bucket.file(menor.caminho)
      .getSignedUrl({ version: "v4", action: "read", expires: Date.now() + VALIDADE_DA_PREVIA_MS });
    return midiaNaTela(midia, [{ largura: menor.largura, url }]);
  } catch (erro) {
    console.error("Falha ao gerar a prévia da lixeira:", erro);
    return midiaNaTela(midia, []);
  }
}

export default async function PaginaAdminMidia() {
  const usuario = await exigirPapelDoPainel();
  const todas = (await lerMidias().get()).docs
    .map((documento) => documento.data())
    .sort((a, b) => (b.criadoEm?.getTime() ?? 0) - (a.criadoEm?.getTime() ?? 0));

  const ativas = todas
    .filter((midia) => !midia.excluidoEm)
    .map((midia) => midiaNaTela(midia));

  const excluidas = await Promise.all(todas.filter((midia) => midia.excluidoEm).map(previaDaLixeira));

  return <MidiaAdminClient ativas={ativas} excluidas={excluidas} podeExcluirDeVez={papelPodeExecutar(usuario.papel, "midia.excluirDeVez")} />;
}
