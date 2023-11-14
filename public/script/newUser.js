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
    event.preventDefault(); // prevent form submission
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

document.getElementById('container__central__form__senha').addEventListener('input', function() {
  const password = this.value;
  const ruleLength = document.getElementById('ruleLength');
  const ruleUppercase = document.getElementById('ruleUppercase');
  const ruleSymbol = document.getElementById('ruleSymbol');

  ruleLength.classList.toggle('hidden', password.length >= 6);
  ruleUppercase.classList.toggle('hidden', /[A-Z]/.test(password));
  ruleSymbol.classList.toggle('hidden', /\W/.test(password));

  [ruleLength, ruleUppercase, ruleSymbol].forEach(rule => {
    rule.addEventListener('animationend', function() {
      if (this.classList.contains('hidden')) {
        this.style.display = 'none';
      }
    });

    if (!rule.classList.contains('hidden')) {
      rule.style.display = '';
    }
  });
});

document.querySelector('.alert').addEventListener('click', function() {
  this.style.display = 'none';
});