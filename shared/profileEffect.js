// Efeito do perfil: recompensa de quem chega a 100 posts. A pessoa escolhe a forma e a paleta
// em Editar perfil, e o efeito cai pela tela de quem abre o perfil dela.

// Pétalas não entram: são exclusivas do perfil da sweetener.
export const EFEITO_TIPOS = {
  notas: 'Notas musicais',
  estrelas: 'Estrelas',
  cd: 'CD holográfico',
};

export const EFEITO_PALETAS = {
  lilas: { nome: 'Lilás', cores: ['#b388ff', '#9b5de5', '#d7b8ff', '#f4a6c8', '#e879b9', '#c084fc'] },
  sol: { nome: 'Pôr do sol', cores: ['#ffb347', '#ff7b54', '#ffd56b', '#ff9e7a', '#f96e6e', '#ffc785'] },
  oceano: { nome: 'Oceano', cores: ['#4cc9f0', '#4895ef', '#90e0ef', '#56cfe1', '#3a86ff', '#a0e7ff'] },
  floresta: { nome: 'Floresta', cores: ['#57cc99', '#38a3a5', '#80ed99', '#22c55e', '#a7f3a0', '#2dd4bf'] },
  noite: { nome: 'Noite', cores: ['#f5f5f5', '#c7c7d9', '#ffe08a', '#a5b4fc', '#e2e8f0', '#fde68a'] },
};

// O que a pessoa recebe ao desbloquear, até escolher outro.
export const EFEITO_PADRAO = { tipo: 'notas', paleta: 'oceano' };

// Devolve { efeito } ou { erro }. Para desligar, a pessoa usa mostrarEfeito, não apaga a escolha.
export function validarEfeito(valor) {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) return { erro: 'Efeito do perfil inválido.' };
  const { tipo, paleta } = valor;
  if (!Object.hasOwn(EFEITO_TIPOS, tipo)) return { erro: 'Escolha uma das formas do efeito.' };
  if (!Object.hasOwn(EFEITO_PALETAS, paleta)) return { erro: 'Escolha uma das paletas do efeito.' };
  return { efeito: { tipo, paleta } };
}

// A escolha gravada, sempre válida: forma que saiu da lista (ex.: corações, que existiu até
// 2026-11) volta para a padrão, mantendo a paleta que a pessoa tinha escolhido.
export function lerEfeito(valor) {
  const { tipo, paleta } = valor && typeof valor === 'object' ? valor : {};
  return {
    tipo: Object.hasOwn(EFEITO_TIPOS, tipo) ? tipo : EFEITO_PADRAO.tipo,
    paleta: Object.hasOwn(EFEITO_PALETAS, paleta) ? paleta : EFEITO_PADRAO.paleta,
  };
}

// O efeito que aparece no perfil: só se foi desbloqueado e está ligado; senão null.
export function efeitoVisivel(usuario) {
  if (!usuario?.efeitoDesde || usuario.mostrarEfeito === false) return null;
  return lerEfeito(usuario.efeitoPerfil);
}
