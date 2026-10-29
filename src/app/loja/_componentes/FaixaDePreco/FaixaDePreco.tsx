"use client";

import { type CSSProperties, useId } from "react";
import { Botao } from "@/components/Botao/Botao";
import { lerPrecoDoFiltro, PARAMETROS } from "@/lib/filtrosDaLoja";
import estilos from "./FaixaDePreco.module.css";

export const MENSAGEM_DE_FORMATO = "Digite o preço só com números, por exemplo 25 ou 25,90.";

const formatoInvalido = (texto: string) => texto.trim() !== "" && lerPrecoDoFiltro(texto) === null;

// Erro dos campos de preço: formato estranho ou a faixa invertida.
export function erroDosCamposDePreco(minimo: string, maximo: string, erroDaFaixa: string | null): string | null {
  return formatoInvalido(minimo) || formatoInvalido(maximo) ? MENSAGEM_DE_FORMATO : erroDaFaixa;
}

const reais = (valor: number) => `R$ ${valor.toLocaleString("pt-BR")}`;

// Preço do filtro da loja (29/10/2026): os campos Mínimo e Máximo em reais e,
// por cima, a faixa com dois pontos (dois input range nativos, sem nome: só
// ajudam a preencher os campos, que são o que vai na URL). Ponto no extremo
// da faixa deixa o campo vazio (sem limite). Sem JavaScript, só os campos.
export function FaixaDePreco({
  minimo,
  maximo,
  faixa,
  erro,
  aoMudar,
  classeDoAplicar,
}: {
  minimo: string;
  maximo: string;
  // Em centavos, já em reais inteiros; null sem produtos.
  faixa: { minimo: number; maximo: number } | null;
  erro: string | null;
  aoMudar: (minimo: string, maximo: string, deslizando: boolean) => void;
  classeDoAplicar?: string;
}) {
  const id = useId();
  const idErro = `${id}-erro`;
  const mensagem = erroDosCamposDePreco(minimo, maximo, erro);

  const piso = faixa ? faixa.minimo / 100 : 0;
  const teto = faixa ? faixa.maximo / 100 : 0;
  const naFaixa = (texto: string, padrao: number) => {
    const centavos = lerPrecoDoFiltro(texto);
    return centavos === null ? padrao : Math.min(teto, Math.max(piso, Math.round(centavos / 100)));
  };
  const valorMinimo = naFaixa(minimo, piso);
  const valorMaximo = Math.max(valorMinimo, naFaixa(maximo, teto));
  const posicao = (valor: number) => `${((valor - piso) / (teto - piso)) * 100}%`;
  const comFaixa = faixa !== null && teto > piso;

  return (
    <div className={estilos.preco}>
      {comFaixa && (
        <div className={estilos.faixa} style={{ "--inicio": posicao(valorMinimo), "--fim": posicao(valorMaximo) } as CSSProperties}>
          <span className={estilos.trilho} aria-hidden="true" />
          <input
            type="range"
            min={piso}
            max={teto}
            step={1}
            value={valorMinimo}
            aria-label="Preço mínimo"
            aria-valuetext={reais(valorMinimo)}
            // O ponto da esquerda fica por cima quando os dois se encontram no fim da faixa.
            className={`${estilos.ponto} ${valorMinimo > (piso + teto) / 2 ? estilos.porCima : ""}`}
            onChange={(evento) => {
              const valor = Math.min(Number(evento.target.value), valorMaximo);
              aoMudar(valor <= piso ? "" : String(valor), maximo, true);
            }}
          />
          <input
            type="range"
            min={piso}
            max={teto}
            step={1}
            value={valorMaximo}
            aria-label="Preço máximo"
            aria-valuetext={reais(valorMaximo)}
            className={estilos.ponto}
            onChange={(evento) => {
              const valor = Math.max(Number(evento.target.value), valorMinimo);
              aoMudar(minimo, valor >= teto ? "" : String(valor), true);
            }}
          />
        </div>
      )}
      <div className={estilos.campos}>
        {[
          { nome: PARAMETROS.precoMinimo, rotulo: "Mínimo", valor: minimo, dica: faixa ? `${faixa.minimo / 100}` : "", mudar: (texto: string) => aoMudar(texto, maximo, false) },
          { nome: PARAMETROS.precoMaximo, rotulo: "Máximo", valor: maximo, dica: faixa ? `${faixa.maximo / 100}` : "", mudar: (texto: string) => aoMudar(minimo, texto, false) },
        ].map((campo) => (
          <div key={campo.nome} className={estilos.campo}>
            <label htmlFor={`${id}-${campo.nome}`} className={estilos.rotulo}>
              {campo.rotulo}
              <span className="somente-leitor"> em reais</span>
            </label>
            <span className={estilos.caixa}>
              <span className={estilos.prefixo} aria-hidden="true">R$</span>
              <input
                id={`${id}-${campo.nome}`}
                name={campo.nome}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder={campo.dica}
                value={campo.valor}
                aria-invalid={mensagem ? true : undefined}
                aria-describedby={mensagem ? idErro : undefined}
                onChange={(evento) => campo.mudar(evento.target.value)}
                className={`${estilos.entrada} ${mensagem ? estilos.comErro : ""}`}
              />
            </span>
          </div>
        ))}
      </div>
      {mensagem && (
        <p id={idErro} role="alert" className={estilos.erro}>
          {mensagem}
        </p>
      )}
      <Botao type="submit" variante="envio" className={classeDoAplicar}>
        Aplicar<span className="somente-leitor"> faixa de preço</span>
      </Botao>
    </div>
  );
}
