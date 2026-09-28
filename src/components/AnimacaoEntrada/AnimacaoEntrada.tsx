"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  atraso?: number;
  className?: string;
  direcao?: "cima" | "baixo" | "esquerda" | "direita" | "nenhuma";
};

export function AnimacaoEntrada({ children, atraso = 0, className, direcao = "cima" }: Props) {
  const variacoes = {
    oculto: {
      opacity: 0,
      y: direcao === "cima" ? 30 : direcao === "baixo" ? -30 : 0,
      x: direcao === "esquerda" ? 30 : direcao === "direita" ? -30 : 0,
    },
    visivel: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.1, 0.25, 1], // ease out muito suave e sofisticado
        delay: atraso,
      },
    },
  };

  return (
    <motion.div
      initial="oculto"
      whileInView="visivel"
      viewport={{ once: true, margin: "-50px" }}
      variants={variacoes}
      className={className}
    >
      {children}
    </motion.div>
  );
}
