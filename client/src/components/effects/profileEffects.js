// Efeitos especiais de perfil, pelo nome de usuário (sem diferenciar maiúsculas).
const EFFECTS = {
  sweetener: 'petalas',
};

export function profileEffectFor(nome) {
  return EFFECTS[(nome ?? '').toLowerCase()] ?? null;
}

// Selo de verificado e a cor de cada um.
const VERIFIED = {
  'meregali.bat': 'tunetalk',
  sweetener: 'olivia',
};

export function verifiedStyleFor(nome) {
  return VERIFIED[(nome ?? '').toLowerCase()] ?? null;
}
