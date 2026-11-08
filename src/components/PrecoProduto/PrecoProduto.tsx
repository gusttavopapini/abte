import { formatarPreco, percentualDeDesconto } from "@/lib/produtos";
import estilos from "./PrecoProduto.module.css";

type Tamanho = "card" | "pagina" | "caixa";

// Preço do produto (08/11/2026, no molde de loja virtual): com promoção, o
// preço normal riscado e pequeno em cima, o preço atual em destaque e, ao
// lado dele, o desconto calculado dos dois preços ("26% OFF"). Só
// informação: não há pagamento online. tamanho: "card" (lista e
// relacionados), "pagina" (bloco de informações do produto) e "caixa" (caixa
// de compra, só o preço atual).
export function PrecoProduto({ preco, precoPromocional, tamanho = "card" }: { preco: number; precoPromocional: number | null; tamanho?: Tamanho }) {
  const comPromocao = precoPromocional !== null && tamanho !== "caixa";
  const desconto = tamanho === "caixa" ? null : percentualDeDesconto({ preco, precoPromocional });
  return (
    <div className={`${estilos.preco} ${estilos[tamanho]}`}>
      {comPromocao && (
        <p className={estilos.antigo}>
          <span className="somente-leitor">De </span>
          <del>{formatarPreco(preco)}</del>
        </p>
      )}
      <p className={estilos.linhaAtual}>
        <span className={estilos.atual}>
          {comPromocao && <span className="somente-leitor">por </span>}
          {formatarPreco(precoPromocional ?? preco)}
        </span>
        {desconto !== null && <span className={estilos.desconto}>{desconto}% OFF</span>}
      </p>
    </div>
  );
}
