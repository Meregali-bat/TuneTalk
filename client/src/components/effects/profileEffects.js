// Efeitos especiais de perfil, pelo nome de usuário (sem diferenciar maiúsculas).
const EFFECTS = {
  sweetener: 'petalas',
};

export function profileEffectFor(nome) {
  return EFFECTS[(nome ?? '').toLowerCase()] ?? null;
}
