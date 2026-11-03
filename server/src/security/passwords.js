import bcrypt from 'bcryptjs';
import md5 from 'md5';

// O sistema antigo guardava md5 puro (32 caracteres hexadecimais). Essas senhas ainda valem,
// mas são regravadas em bcrypt assim que a pessoa entra (needsRehash).
const LEGACY_MD5 = /^[0-9a-f]{32}$/;
const NOT_OK = { ok: false, needsRehash: false };

export function createPasswords({ rounds = 10 } = {}) {
  return {
    hash: (senha) => bcrypt.hash(senha, rounds),

    async verify(senha, stored) {
      if (!stored) return NOT_OK;
      if (LEGACY_MD5.test(stored)) return md5(senha) === stored ? { ok: true, needsRehash: true } : NOT_OK;
      if (!stored.startsWith('$2')) return NOT_OK;
      return (await bcrypt.compare(senha, stored)) ? { ok: true, needsRehash: false } : NOT_OK;
    },
  };
}
