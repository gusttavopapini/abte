"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import estilos from "./CarrosselQuemSomos.module.css";

const itens = [
  {
    id: "missao",
    titulo: "Missão",
    texto: "Reunir fisioterapeutas, médicos e parceiros engajados no Tratamento Conservador da Escoliose Baseado em Evidências, para trocar informações, criar ações de conscientização e promover tratamentos de qualidade em todo o território nacional.",
  },
  {
    id: "visao",
    titulo: "Visão",
    texto: "Ser referência em Tratamento Conservador da Escoliose na América Latina.",
  },
  {
    id: "valores",
    titulo: "Valores",
    texto: "Ética, Empatia, Comprometimento, Acolhimento, Respeito, Trabalho em equipe, Responsabilidade Social, Educação Continuada e Prática Baseada em Evidências.",
  },
];

export function CarrosselQuemSomos() {
  const [ativo, setAtivo] = useState(0);

  // Auto-play simples
  useEffect(() => {
    const intervalo = setInterval(() => {
      setAtivo((atual) => (atual + 1) % itens.length);
    }, 5000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className={estilos.container}>
      <div className={estilos.slides}>
        {itens.map((item, index) => (
          <motion.div
            key={item.id}
            className={estilos.slide}
            initial={{ opacity: 0, x: 20 }}
            animate={{
              opacity: ativo === index ? 1 : 0,
              x: ativo === index ? 0 : ativo > index ? -20 : 20,
              pointerEvents: ativo === index ? "auto" : "none",
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <h3 className={`tipo-h3 ${estilos.titulo}`}>{item.titulo}</h3>
            <p className={`tipo-texto-lg ${estilos.texto}`}>{item.texto}</p>
          </motion.div>
        ))}
      </div>
      <div className={estilos.controles}>
        {itens.map((_, index) => (
          <button
            key={index}
            onClick={() => setAtivo(index)}
            className={`${estilos.ponto} ${ativo === index ? estilos.pontoAtivo : ""}`}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
