const inputFile = document.querySelector('#container__central__form__imagem');
const pictureImage = document.querySelector('.picture__img');
const icone = document.querySelector('#icone');

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
  
  }
});

document.getElementById('container__central__form').addEventListener('submit', function(event) {
  const password = document.getElementById('container__central__form__senha').value;
  const confirmPassword = document.getElementById('container__central__form__confirmarSenha').value;
  const passwordError = document.getElementById('passwordError');

  if (password !== confirmPassword) {
    passwordError.textContent = 'Passwords do not match.';
    event.preventDefault(); // prevent form submission
  } else {
    passwordError.textContent = ''; // clear the error message if the passwords match
  }
});