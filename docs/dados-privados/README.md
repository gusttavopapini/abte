# Dados privados da migração

Esta pasta guarda os dados de origem da migração do site antigo (etapa 6): listas de imagens, exportações e planilhas recebidas da ABTE.

**Nada aqui é versionado.** O `.gitignore` ignora todo o conteúdo desta pasta, exceto este README. Os arquivos ficam só no computador de quem roda a migração e nunca vão para o GitHub.

Regras:

- Não copie para fora desta pasta (código, documentação, mensagens de commit) nenhum dado pessoal que esteja aqui: nomes, registros profissionais, e-mails, telefones ou fotos.
- Antes de colocar um arquivo novo aqui, confira que ele aparece como ignorado: `git check-ignore -v docs/dados-privados/<arquivo>`.
- A saída dos scripts de migração (relatórios e arquivos temporários) vai para a pasta `tmp-migracao/`, na raiz do projeto, também ignorada pelo Git.
- Quando a migração terminar, apague os arquivos desta pasta que não forem mais necessários.
