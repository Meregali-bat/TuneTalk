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

const passwordInput = document.getElementById('container__central__form__senha');
const confirmPasswordInput = document.getElementById('container__central__form__confirmarSenha');
const passwordError = document.getElementById('passwordError');

function checkPasswords() {
  if (passwordInput.value !== confirmPasswordInput.value) {
    passwordError.textContent = 'Senhas diferentes.';
  } else {
    passwordError.textContent = ''; // clear the error message if the passwords match
  }
}

passwordInput.addEventListener('input', checkPasswords);
confirmPasswordInput.addEventListener('input', checkPasswords);

document.getElementById('container__central__form').addEventListener('submit', function(event) {
  if (passwordInput.value !== confirmPasswordInput.value) {
    event.preventDefault(); 
  }
});

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  
  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("bi-eye-slash");
    icon.classList.add("bi-eye");
  } else {
    input.type = "password";
    icon.classList.remove("bi-eye");
    icon.classList.add("bi-eye-slash");
  }
}

const alert = document.querySelector('.alert');
if (alert) {
  alert.addEventListener('click', () => {
    alert.style.display = 'none';
  });
}

// Obtenha uma referência aos elementos de regra
const ruleLength = document.getElementById('ruleLength');
const ruleUppercase = document.getElementById('ruleUppercase');
const ruleSymbol = document.getElementById('ruleSymbol');

// Adicione um ouvinte de evento ao campo de entrada da senha
document.getElementById('container__central__form__senha').addEventListener('input', function() {
  const password = this.value;

  // Verifique cada regra e oculte o elemento correspondente se a regra for cumprida
  if (password.length >= 6) {
    ruleLength.style.display = 'none';
  } else {
    ruleLength.style.display = 'block';
  }

  if (/[A-Z]/.test(password)) {
    ruleUppercase.style.display = 'none';
  } else {
    ruleUppercase.style.display = 'block';
  }

  if (/\W/.test(password)) {
    ruleSymbol.style.display = 'none';
  } else {
    ruleSymbol.style.display = 'block';
  }
});