
function searchFunction(e) {
    document
      .getElementById("search-input")
      .addEventListener("input", function (e) {
        const searchQuery = e.target.value;
        const url = `https://deezerdevs-deezer.p.rapidapi.com/search?q=${encodeURIComponent(searchQuery)}`;
        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': '23a8cab7cfmshc44f57269f2dff6p14817fjsn8b61352c895b',
                'X-RapidAPI-Host': 'deezerdevs-deezer.p.rapidapi.com'
            }
        };
        fetch(url, options)
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
        <img id="foto-musica" src="${track.album.cover_medium}" alt="${track.title}" class="img-fluid rounded" style="max-width: 150px;">
        <form action="/create-post" method="post" class="ml-3 d-flex flex-column">
            <div class="form-group">
                <textarea id="texto" name="texto" class="form-control" rows="3"></textarea>
            </div>
            <input id="musicName" name="musicName" type="hidden" value="${track.title}">
            <input id="artistName" name="artistName" type="hidden" value="${track.artist.name}">
            <input id="posterMusica" name="posterMusica" type="hidden" value="${track.album.cover_medium}">
            <input id="postType" name="postType" type="hidden" value="música">
            <input id="releaseDate" name="releaseDate" type="hidden" value="${track.duration}">
            <div class="form-group">
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
            </div>
            <button type="submit" class="btn btn-primary align-self-center">Postar</button>
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
