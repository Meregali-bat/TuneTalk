import { badGateway } from '../errors.js';

export function createCloudinaryUploader(cloudinary) {
  return {
    upload(buffer) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ resource_type: 'image' }, (error, result) => {
          if (error) {
            console.error('Erro ao fazer o upload da imagem:', error);
            return reject(badGateway('Erro ao fazer o upload da imagem'));
          }
          resolve(result.secure_url);
        });
        stream.end(buffer);
      });
    },
  };
}
