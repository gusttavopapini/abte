import type { Metadata } from "next";
import { EstruturaPainel } from "@/app/admin/_componentes/EstruturaPainel/EstruturaPainel";
import { FormularioRecuperarSenha } from "@/components/FormularioRecuperarSenha/FormularioRecuperarSenha";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function PaginaRecuperarSenha() {
  return (
    <EstruturaPainel titulo="Esqueci minha senha">
      <FormularioRecuperarSenha rotaDoLogin="/admin/entrar" deOnde="do painel" />
    </EstruturaPainel>
  );
}
