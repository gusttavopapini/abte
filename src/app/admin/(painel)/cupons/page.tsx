import type { Metadata } from "next";
import { CabecalhoDoPainel } from "@/app/admin/_componentes/CabecalhoDoPainel/CabecalhoDoPainel";
import { CelulaDoPainel, TabelaPainel } from "@/app/admin/_componentes/TabelaPainel/TabelaPainel";
import { exigirPapelDoPainel } from "@/lib/auth/sessao";
import { listarCupons } from "@/lib/dados/cupons";
import { AcoesDoCupom, FormularioNovoCupom } from "./FormulariosDosCupons";
import estilos from "../pedidos/pedidos.module.css";

export const metadata: Metadata = { title: "Cupons" };
export const dynamic = "force-dynamic";

// Cupons de desconto da loja (21/11/2026, só administrador): código e
// percentual sobre os produtos (o frete não entra).
export default async function PaginaCupons() {
  await exigirPapelDoPainel("loja.configurar");
  const cupons = await listarCupons();
  return (
    <>
      <CabecalhoDoPainel
        trilha={[{ rotulo: "Visão geral", href: "/admin" }, { rotulo: "Pedidos", href: "/admin/pedidos" }, { rotulo: "Cupons" }]}
        titulo="Cupons"
        descricao="Códigos de desconto que o cliente digita no carrinho. O percentual vale sobre os produtos; o frete não entra."
      />
      <div className={`${estilos.caixa} ${estilos.caixaDoFormulario}`}>
        <h2 className={estilos.subtitulo}>Novo cupom</h2>
        <FormularioNovoCupom />
      </div>
      <TabelaPainel
        legenda="Cupons, em ordem alfabética do código."
        colunas={["Código", "Desconto", "Usos", "Situação", "Ações"]}
        vazia={cupons.length === 0}
        estadoVazio={<p className="tipo-texto">Nenhum cupom cadastrado ainda.</p>}
      >
        {cupons.map((cupom) => (
          <tr key={cupom.codigo}>
            <CelulaDoPainel rotulo="Código" destaque>{cupom.codigo}</CelulaDoPainel>
            <CelulaDoPainel rotulo="Desconto">{cupom.percentual}%</CelulaDoPainel>
            <CelulaDoPainel rotulo="Usos">{cupom.usos === 1 ? "1 pedido pago" : `${cupom.usos} pedidos pagos`}</CelulaDoPainel>
            <CelulaDoPainel rotulo="Situação">{cupom.ativo ? "Ativo" : "Inativo"}</CelulaDoPainel>
            <CelulaDoPainel rotulo="Ações" acoes>
              <AcoesDoCupom codigo={cupom.codigo} percentual={cupom.percentual} ativo={cupom.ativo} />
            </CelulaDoPainel>
          </tr>
        ))}
      </TabelaPainel>
    </>
  );
}
