import { formatarPreco } from "@/lib/produtos";
import { resumirCompra, rotuloDoSubtotal } from "@/lib/loja/resumoDaCompra";
import estilos from "./ResumoDaCompra.module.css";

// Subtotal, frete e total da caixa de compra (08/11/2026). Os valores vêm
// do servidor por props; a conta é só para exibir. Só o total é anunciado
// aos leitores de tela quando a quantidade muda.
export function ResumoDaCompra({ precoUnitario, quantidade, tipo, freteFixo }: { precoUnitario: number; quantidade: number; tipo: "fisico" | "digital"; freteFixo: number | null }) {
  const resumo = resumirCompra(precoUnitario, quantidade, tipo, freteFixo);
  return (
    <dl className={estilos.resumo}>
      <div className={estilos.linha}>
        <dt>{rotuloDoSubtotal(resumo.quantidade)}</dt>
        <dd>{formatarPreco(resumo.subtotal)}</dd>
      </div>
      <div className={estilos.linha}>
        <dt>Frete</dt>
        <dd>{resumo.frete !== null ? formatarPreco(resumo.frete) : resumo.textoDoFrete}</dd>
      </div>
      <div className={`${estilos.linha} ${estilos.total}`}>
        <dt>Total</dt>
        <dd aria-live="polite">{formatarPreco(resumo.total)}</dd>
      </div>
    </dl>
  );
}
