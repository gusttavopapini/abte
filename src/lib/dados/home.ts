// Leitura das imagens da home (29/10/2026), SOMENTE no servidor. Sem o
// documento configuracoes/home, ou se a leitura falhar, devolve null: a home
// mostra o padrão de antes (lib/site/home.ts).
import "server-only";

import { firestoreAdmin } from "@/lib/firebase/servidor";
import { COLECAO_DA_HOME, DOCUMENTO_DA_HOME, lerConfiguracaoDaHome, type ConfiguracaoDaHome } from "@/lib/site/home";

export async function lerImagensDaHome(): Promise<ConfiguracaoDaHome | null> {
  try {
    const documento = await firestoreAdmin().collection(COLECAO_DA_HOME).doc(DOCUMENTO_DA_HOME).get();
    return documento.exists ? lerConfiguracaoDaHome(documento.data()) : null;
  } catch (erro) {
    console.error("Falha ao ler as imagens da home:", erro);
    return null;
  }
}
