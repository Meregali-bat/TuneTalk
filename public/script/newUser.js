const inputFile = document.querySelector('#container__central__form__imagem');
const pictureImage = document.querySelector('.picture__img');
const pictureImageTxt = 'Escolha sua foto de perfil';
const icone = document.querySelector('#icone');
pictureImage.innerHTML = pictureImageTxt;

inputFile.addEventListener('change', function(e) {
  const inputTarget = e.target;
  const file = inputTarget.files[0];

  if (file) {
    const reader = new FileReader();

    reader.addEventListener('load', function(e) {
      const readerTarget = e.target;

      const img = document.createElement('img');
      img.src = readerTarget.result;
      img.classList.add('picture__img');

      pictureImage.innerHTML = '';
      icone.style.display = 'none';

      pictureImage.appendChild(img);
    });

    reader.readAsDataURL(file);
  } else {
    pictureImage.innerHTML = pictureImageTxt;
  }
});
