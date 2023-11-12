let access_token;

const client_id = "321c28ffad9b471997daad9f28d835a9";
const client_secret = "9255a0a660ab4b76a1805a946c41d127";
const redirect_uri = "http://localhost:3000/foryou";
const authorization_url = "https://accounts.spotify.com/authorize";
const token_url = "https://accounts.spotify.com/api/token";

function requestAuthorization() {
  const scope = "user-top-read";
  const state = generateRandomState();
  const authUrl = `${authorization_url}?client_id=${client_id}&response_type=code&redirect_uri=${redirect_uri}&scope=${scope}&state=${state}`;
  window.location.href = authUrl;
  console.log("foi para autorizacao");
}

function getAuthorizationCode() {
  const params = new URLSearchParams(window.location.search);
  console.log("pegou autorizacao");
  return params.get("code");
}

function exchangeCodeForToken(code) {
  const data = {
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirect_uri,
    client_id: client_id,
    client_secret: client_secret,
  };

  fetch(token_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(data),
  })
    .then((response) => response.json())
    .then((data) => {
      access_token = data.access_token;
    })
    .catch((error) => {
      console.error("Erro ao trocar código por token:", error);
    });
  console.log("trocou código pelo token");
}

function generateRandomState() {
  console.log("gerou estado aleatorio");
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

function paginaCarregada() {
  let authorizationCode = getAuthorizationCode();
  if (authorizationCode) {
    exchangeCodeForToken(authorizationCode);
    console.log("verificou se a código de autorizacao");
  } else {
    requestAuthorization();
  }
}

function searchFunction(e) {
  document
    .getElementById("search-input")
    .addEventListener("input", function (e) {
      const searchQuery = e.target.value;
      const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        searchQuery
      )}&type=album%2Ctrack`;

      fetch(url, {
        headers: {
          Authorization: "Bearer " + access_token,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          document.getElementById("search-results").innerHTML = "";

          data.albums.items.forEach((album) => {
            const div = document.createElement("div");
            const img = document.createElement("img");
          
            img.src = album.images[0].url;
          
            div.appendChild(img);
            div.appendChild(
              document.createTextNode(
                `${album.name} by ${album.artists[0].name} (Album)`
              )
            );
          
            div.addEventListener("click", function () {
              document.getElementById("search-bar").innerHTML = `
                  <div style="display: flex; flex-direction: column; height: 100%;">
                    <h2 id="album-name">${album.name} by ${album.artists[0].name}</h2>
                    <div style="display: flex; flex-grow: 1; align-items: center;">
                      <img id="foto-album" src="${album.images[0].url}" alt="${album.name}">
                      <form action="/create-post" method="post" style="margin-left: 20px;">
                        <textarea id="texto" name="texto"></textarea>
                        <input id="albumName" name="albumName" type="hidden" value="${album.name}">
                        <input id="artistName" name="artistName" type="hidden" value="${album.artists[0].name}">
                        <input id="posterAlbum" name="posterAlbum" type="hidden" value="${album.images[0].url}">
                        <input id="postType" name="postType" type="hidden" value="album">
                        <input id="releaseDate" name="releaseDate" type="hidden" value="${album.release_date}">
                        <button type="submit" class="botão-criarpost" style="align-self: flex-end;">Postar</button>
                      </form>
                    </div>
                  </div>
                `;
            });
          
            div.className = "search-result";
            img.className = "search-result-img";
          
            document.getElementById("search-results").appendChild(div);
          });

          data.tracks.items.forEach((track) => {
            const div = document.createElement("div");
            const img = document.createElement("img");

            img.src = track.album.images[0].url;

            div.appendChild(img);
            div.appendChild(
              document.createTextNode(
                `${track.name} by ${track.artists[0].name} (Track)`
              )
            );

            div.addEventListener("click", function () {
              document.getElementById("search-bar").innerHTML = `
                  <div style="display: flex; flex-direction: column; height: 100%;">
                    <h2 id="music-name">${track.name} by ${track.artists[0].name}</h2>
                    <div style="display: flex; flex-grow: 1; align-items: center;">
                      <img id="foto-musica" src="${track.album.images[0].url}" alt="${track.name}">
                      <form action="/create-post" method="post" style="margin-left: 20px;">
                        <textarea id="texto" name="texto"></textarea>
                        <input id="musicName" name="musicName" type="hidden" value="${track.name}">
                        <input id="artistName" name="artistName" type="hidden" value="${track.artists[0].name}">
                        <input id="posterMusica" name="posterMusica" type="hidden" value="${track.album.images[0].url}"> 
                        <input id="postType" name="postType" type="hidden" value="música">
                        <input id="releaseDate" name="releaseDate" type="hidden" value="${track.album.release_date}">
                        <button type="submit" class="botão-criarpost" style="align-self: flex-end;">Postar</button>
                      </form>
                    </div>
                  </div>
                `;
            });
            document.getElementById("search-results").appendChild(div);
          });
        });
    });
}

document
  .querySelector(".botão-criarpost")
  .addEventListener("click", function () {
    document.getElementById("search-bar").style.display = "block";
    document.getElementById("overlay").style.display = "block";
    
    searchFunction();
  });

  document.getElementById("overlay").addEventListener("click", function () {
    document.getElementById("search-bar").style.display = "none";
    document.getElementById("overlay").style.display = "none";
  });
  