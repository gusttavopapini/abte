import type { Metadata } from "next";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerProfissionais, ordenarProfissionais } from "@/lib/dados/colecoes";
import { imagensAtivasPorId } from "@/lib/midia/exibicao";
import type { Profissional } from "@/lib/dados/tipos";
import type { ProfissionalNaTela } from "@/app/admin/_componentes/FormularioProfissional/FormularioProfissional";
import { ProfissionaisAdminClient } from "./ProfissionaisAdminClient";

export const metadata: Metadata = { title: "Profissionais" };

export default async function PaginaAdminProfissionais() {
  await exigirPapelDoPainel();
  const todos = ordenarProfissionais((await lerProfissionais().get()).docs.map((documento) => documento.data()));
  const fotos = await imagensAtivasPorId(todos.map((profissional) => profissional.fotoMidiaId));
  // Só os campos que a tela usa; as datas não vão para o navegador.
  const paraTela = (lista: Profissional[]): ProfissionalNaTela[] =>
    lista.map((profissional) => ({
      id: profissional.id,
      tipo: profissional.tipo,
      tratamento: profissional.tratamento,
      nome: profissional.nome,
      registro: profissional.registro,
      metodos: profissional.metodos,
      pais: profissional.pais,
      uf: profissional.uf,
      cidades: profissional.cidades,
      telerreabilitacao: profissional.telerreabilitacao,
      whatsapp: profissional.whatsapp,
      instagram: profissional.instagram,
      facebook: profissional.facebook,
      email: profissional.email,
      bio: profissional.bio,
      ativo: profissional.ativo,
      ordem: profissional.ordem,
      fotoMidiaId: profissional.fotoMidiaId,
      foto: profissional.fotoMidiaId ? fotos.get(profissional.fotoMidiaId) ?? null : null,
    }));

  return (
    <ProfissionaisAdminClient
      ativos={paraTela(todos.filter((profissional) => !profissional.excluidoEm))}
      excluidos={paraTela(todos.filter((profissional) => profissional.excluidoEm))}
    />
  );
}
