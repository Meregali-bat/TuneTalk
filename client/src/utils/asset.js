// Caminho de arquivos de client/public respeitando o `base` do Vite (a demo é servida fora da raiz).
export const asset = (path) => `${import.meta.env.BASE_URL}${path}`;
