// Memória das listas em páginas (feeds) enquanto o app está aberto: os posts já carregados e
// onde a pessoa tinha rolado. Ao voltar de um post para o feed, a lista reaparece igual, no
// mesmo ponto, sem buscar tudo de novo. Fica só na memória da aba (recarregar a página zera).
const memoria = new Map();

export const lembrarLista = (chave, dados) => memoria.set(chave, { ...memoria.get(chave), ...dados });
export const lerLista = (chave) => memoria.get(chave) ?? null;
export const esquecerListas = () => memoria.clear();
