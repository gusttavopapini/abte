import type { Metadata } from "next";
import { FormularioRecuperarSenha } from "@/components/FormularioRecuperarSenha/FormularioRecuperarSenha";
import { CaixaDeAcesso } from "../../_componentes/CaixaDeAcesso/CaixaDeAcesso";

export const metadata: Metadata = { title: "Esqueci minha senha", robots: { index: false, follow: false } };

export default function PaginaRecuperarSenhaLoja() {
  return (
    <CaixaDeAcesso titulo="Esqueci minha senha">
      <FormularioRecuperarSenha rotaDoLogin="/loja/entrar" deOnde="da loja" />
    </CaixaDeAcesso>
  );
}
