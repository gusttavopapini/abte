import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { lerSessao } from "@/lib/auth/sessao";
import { EstruturaPainel } from "../_componentes/EstruturaPainel/EstruturaPainel";
import { FormularioLogin } from "../_componentes/FormularioLogin/FormularioLogin";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar() {
  // Quem já tem sessão válida com papel vai direto para o painel.
  const sessao = await lerSessao();
  if (sessao?.papel) redirect("/admin");

  return (
    <EstruturaPainel titulo="Entrar no painel">
      <FormularioLogin />
    </EstruturaPainel>
  );
}
