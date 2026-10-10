import { formatarPreco } from "@/lib/produtos";
import estilos from "./PrecoProduto.module.css";

// Preço do produto: com promoção, o normal aparece riscado antes do promocional.
// Só informação: não há pagamento online.
export function PrecoProduto({ preco, precoPromocional, grande = false }: { preco: number; precoPromocional: number | null; grande?: boolean }) {
  const classe = `${estilos.preco} ${grande ? estilos.grande : ""}`;
  if (precoPromocional === null) return <p className={classe}>{formatarPreco(preco)}</p>;
  return (
    <p className={classe}>
      <span className="somente-leitor">De </span>
      <del className={estilos.riscado}>{formatarPreco(preco)}</del>
      <span className="somente-leitor"> por </span>
      <span>{formatarPreco(precoPromocional)}</span>
    </p>
  );
}
