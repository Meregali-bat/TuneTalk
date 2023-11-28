
function searchFunction(e) {
    document
      .getElementById("search-input")
      .addEventListener("input", function (e) {
        const searchQuery = e.target.value;
        const url = `https://api.deezer.com/search?q=${encodeURIComponent(searchQuery)}`;
  
        fetch(url)
          .then((response) => response.json())
          .then((data) => {
            document.getElementById("search-results").innerHTML = "";
  
            data.data.forEach((track) => {
              const div = document.createElement("div");
              const img = document.createElement("img");
  
              img.src = track.album.cover_medium;
  
              div.appendChild(img);
              div.appendChild(
                document.createTextNode(
                  `${track.title} by ${track.artist.name} (Track)`
                )
              );
  
              div.addEventListener("click", function () {
                console.log(track.duration);
                document.getElementById("search-bar").innerHTML = `
                <div style="display: flex; flex-direction: column; height: 100%;">
                  <h2 id="music-name">${track.title} by ${track.artist.name}</h2>
                  <div class="post-configs">
                    <img id="foto-musica" src="${track.album.cover_medium}" alt="${track.title}">
                    <form action="/create-post" method="post" style="margin-left: 20px;">
                      <textarea id="texto" name="texto"></textarea>
                      <input id="musicName" name="musicName" type="hidden" value="${track.title}">
                      <input id="artistName" name="artistName" type="hidden" value="${track.artist.name}">
                      <input id="posterMusica" name="posterMusica" type="hidden" value="${track.album.cover_medium}"> 
                      <input id="postType" name="postType" type="hidden" value="música">
                      <input id="releaseDate" name="releaseDate" type="hidden" value="${track.duration}">
                      <div class="star-rating">
                        <input type="radio" id="1-star" name="nota" value="1">
                        <label for="1-star"><i class="bi bi-star-fill"></i></label>
                        <input type="radio" id="2-star" name="nota" value="2">
                        <label for="2-star"><i class="bi bi-star-fill"></i></label>
                        <input type="radio" id="3-star" name="nota" value="3">
                        <label for="3-star"><i class="bi bi-star-fill"></i></label>
                        <input type="radio" id="4-star" name="nota" value="4">
                        <label for="4-star"><i class="bi bi-star-fill"></i></label>
                        <input type="radio" id="5-star" name="nota" value="5">
                        <label for="5-star"><i class="bi bi-star-fill"></i></label>
                      </div>
                      <button type="submit" class="btn-postar">Postar</button>
                    </form>
                  </div>
                </div>
              `;
            });
          
            div.className = "search-result";
            img.className = "search-result-img";
          
            document.getElementById("search-results").appendChild(div);
          });
        });
    });
};

document
  .querySelector(".botao-criarpost")
  .addEventListener("click", function () {
    document.getElementById("search-bar").style.display = "block";
    document.getElementById("overlay").style.display = "block";
    searchFunction();
  });

  document.getElementById("overlay").addEventListener("click", function () {
    document.getElementById("search-bar").style.display = "none";
    document.getElementById("overlay").style.display = "none";
  });
