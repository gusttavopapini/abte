import type { Metadata } from "next";
import { EstruturaPainel } from "../../_componentes/EstruturaPainel/EstruturaPainel";
import { FormularioRecuperarSenha } from "../../_componentes/FormularioRecuperarSenha/FormularioRecuperarSenha";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function PaginaRecuperarSenha() {
  return (
    <EstruturaPainel titulo="Esqueci minha senha">
      <FormularioRecuperarSenha />
    </EstruturaPainel>
  );
}
