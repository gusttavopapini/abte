import type { Metadata } from "next";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { firestoreAdmin } from "@/lib/firebase/servidor";
import { DOCUMENTO_DA_LOJA, lerFreteFixo } from "@/lib/loja/pagamento";
import { precoParaCampo } from "@/lib/produtos";
import { FormularioDoFrete } from "../../pedidos/FormulariosDoPainelDaLoja";
import estilos from "../../pedidos/pedidos.module.css";

export const metadata: Metadata = { title: "Frete da loja" };
export const dynamic = "force-dynamic";

// Configurações da loja (08/11/2026, só administrador): frete fixo por pedido.
export default async function PaginaFrete() {
  await exigirPapelDoPainel("loja.configurar");
  const frete = lerFreteFixo((await firestoreAdmin().collection("configuracoes").doc(DOCUMENTO_DA_LOJA).get()).get("freteFixo"));
  return (
    <>
      <CabecalhoDoPainel trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Pedidos", href: "/admin/pedidos" }, { rotulo: "Frete da loja" }]} titulo="Frete da loja" descricao="Valor fixo cobrado uma vez por pedido com produto físico. Só o administrador altera." />
      <div className={`${estilos.caixa} ${estilos.caixaDoFormulario}`}>
        <FormularioDoFrete valorAtual={precoParaCampo(frete)} />
      </div>
    </>
  );
}
