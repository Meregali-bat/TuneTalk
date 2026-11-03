// A foto vai direto do navegador para o Cloudinary (até 10 MB no plano grátis, GIF animado incluso):
// a Vercel recusa requisições acima de 4,5 MB, então ela não pode passar pelo nosso servidor.
// O servidor só assina o envio (o segredo nunca sai daqui) e depois confere o link salvo.
const FOLDERS = { perfil: 'tunetalk/perfis', banner: 'tunetalk/banners', post: 'tunetalk/posts' };

export function createCloudinaryUploader(cloudinary, { now = Date.now } = {}) {
  const config = () => cloudinary.config();

  return {
    signUpload(tipo = 'perfil') {
      const { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret } = config();
      const params = { timestamp: Math.floor(now() / 1000), folder: FOLDERS[tipo] };
      return {
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        fields: { api_key: apiKey, ...params, signature: cloudinary.utils.api_sign_request(params, apiSecret) },
      };
    },

    isOwnUrl(url, tipo = 'perfil') {
      const prefix = `https://res.cloudinary.com/${config().cloud_name}/image/upload/`;
      return typeof url === 'string' && url.startsWith(prefix) && url.includes(`/${FOLDERS[tipo]}/`);
    },
  };
}
