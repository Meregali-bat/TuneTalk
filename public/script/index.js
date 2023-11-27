document.querySelector('.botao-editar-perfil').addEventListener('click', function() {
  document.getElementById('popup').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';
});

document.getElementById('foto').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onloadend = function() {
    document.querySelector('#popup .profile-picture').src = reader.result;
  }

  if (file) {
    reader.readAsDataURL(file);
  } else {
    document.querySelector('#popup .profile-picture').src = "";
  }
});

document.querySelector('.bi-x-lg').addEventListener('click', function() {
  document.getElementById('popup').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
});


