import type { Metadata } from "next";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { lerProfissionais } from "@/lib/dados/colecoes";
import { ProfissionaisAdminClient } from "./ProfissionaisAdminClient";

export const metadata: Metadata = { title: "Profissionais" };

export default async function PaginaAdminProfissionais() {
  await exigirPapelDoPainel();
  const snapshot = await lerProfissionais().orderBy("criadoEm", "desc").get();
  // Só os campos que a tela usa; as datas não vão para o navegador.
  const profissionais = snapshot.docs.map((documento) => {
    const { id, nome, especialidade, tag, linkedinUrl, imagemUrl, status } = documento.data();
    return { id, nome, especialidade, tag, linkedinUrl, imagemUrl, status };
  });

  return <ProfissionaisAdminClient profissionaisIniciais={profissionais} />;
}
