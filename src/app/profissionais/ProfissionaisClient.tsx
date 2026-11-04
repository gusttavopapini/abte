"use client";

import { useId, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CardProfissional } from "@/components/CardProfissional/CardProfissional";
import { PopupProfissional } from "@/components/PopupProfissional/PopupProfissional";
import { TAGS_DE_PROFISSIONAIS } from "@/config/profissionais";
import { filtrarProfissionais, opcoesDeRegiao, regiaoDoEndereco, textoDaQuantidade, tipoDoEndereco, TODOS_OS_TIPOS, valorDaRegiao } from "@/lib/filtroDeProfissionais";
import type { ProfissionalPublico } from "@/lib/profissionaisPublicos";
import estilos from "./page.module.css";
import { revelar } from "@/components/Revelar/revelar";

const OPCOES_DO_TIPO: readonly string[] = [TODOS_OS_TIPOS, ...TAGS_DE_PROFISSIONAIS];

// Filtros, grade de cards e popup de detalhes da página /profissionais. O tipo
// (?tag=...) e o estado (?uf=SP ou ?pais=BO, 04/11/2026) ficam no endereço e
// se combinam; o link do submenu abre já filtrado pelo tipo. Recebe só os
// campos públicos (paraProfissionalPublico).
export function ProfissionaisClient({ profissionais }: { profissionais: ProfissionalPublico[] }) {
  const [aberto, setAberto] = useState<ProfissionalPublico | null>(null);
  const parametros = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const idDoEstado = useId();
  const seletorRef = useRef<HTMLSelectElement>(null);

  // As opções de estado nascem dos dados (só onde há profissional).
  const opcoes = useMemo(() => opcoesDeRegiao(profissionais), [profissionais]);
  const tipoAtivo = tipoDoEndereco(parametros);
  const regiaoAtiva = regiaoDoEndereco(parametros, opcoes);
  const filtrados = filtrarProfissionais(profissionais, tipoAtivo, regiaoAtiva);

  function irPara(mudar: (novos: URLSearchParams) => void) {
    const novos = new URLSearchParams(parametros.toString());
    mudar(novos);
    const consulta = novos.toString();
    router.replace(consulta ? `${pathname}?${consulta}` : pathname, { scroll: false });
  }

  function selecionarTipo(tipo: string) {
    irPara((novos) => (tipo === TODOS_OS_TIPOS ? novos.delete("tag") : novos.set("tag", tipo)));
  }

  function selecionarRegiao(valor: string) {
    const opcao = opcoes.find((item) => item.valor === valor);
    irPara((novos) => {
      novos.delete("uf");
      novos.delete("pais");
      if (opcao?.regiao.tipo === "uf") novos.set("uf", opcao.regiao.uf);
      if (opcao?.regiao.tipo === "pais") novos.set("pais", opcao.regiao.pais);
    });
  }

  // Limpa o tipo e o estado e devolve o foco ao seletor de estado (o botão
  // some depois de limpar).
  function limparFiltros() {
    irPara((novos) => {
      novos.delete("tag");
      novos.delete("uf");
      novos.delete("pais");
    });
    seletorRef.current?.focus();
  }

  return (
    <>
      <div className={estilos.filtros} role="group" aria-label="Tipo de profissional">
        {OPCOES_DO_TIPO.map((tipo) => (
          <button
            key={tipo}
            type="button"
            aria-pressed={tipoAtivo === tipo}
            onClick={() => selecionarTipo(tipo)}
            className={`${estilos.tag} ${tipoAtivo === tipo ? estilos.tagAtiva : ""}`}
          >
            {tipo}
          </button>
        ))}
      </div>

      <div className={estilos.estado}>
        <label htmlFor={idDoEstado} className={estilos.rotuloDoEstado}>
          Estado
        </label>
        <select ref={seletorRef} id={idDoEstado} className={estilos.seletor} value={valorDaRegiao(regiaoAtiva)} onChange={(evento) => selecionarRegiao(evento.target.value)}>
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div aria-live="polite" className={estilos.resultado}>
        {filtrados.length > 0 ? (
          <p className={estilos.quantidade}>{textoDaQuantidade(filtrados.length)}</p>
        ) : (
          <div className={estilos.vazio}>
            <p>{textoDaQuantidade(0)}</p>
            <button type="button" className={estilos.tag} onClick={limparFiltros}>
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      <div {...revelar("grade-de-cards")}>
        {filtrados.map((profissional) => (
          <CardProfissional key={profissional.id} profissional={profissional} aoVerMais={() => setAberto(profissional)} />
        ))}
      </div>

      <PopupProfissional profissional={aberto} aoFechar={() => setAberto(null)} />
    </>
  );
}
