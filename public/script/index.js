let divCharts = document.querySelector('#charts-artistas');
let api_key = 'a5561aa7b177803b3712501bc8aade9b';

const url = `http://ws.audioscrobbler.com/2.0/?method=geo.gettopartists&country=brazil&api_key=${api_key}&format=json`;

fetch(url)
    .then((response) => {
        return response.json();
    })
    .then((data) => {
        console.log(data);
        let artistas = data.topartists.artist;
        let html = '';
        artistas.forEach((artista) => {
            html += `
                <div class="chart-artistas">
                    <img src="${artista.image[2]['#text']}" alt="">
                    <h3>${artista.name}</h3>
                    <p>${artista.playcount} plays</p>
                </div>
                `;
        });
        divCharts.innerHTML = html;
    });


function searchFunction(e) {
    document.getElementById('search-input').addEventListener('input', function (e) {
        const searchQuery = e.target.value;
        const url = `http://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(searchQuery)}&api_key=${api_key}&format=json`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                document.getElementById('search-results').innerHTML = '';

                data.results.trackmatches.track.forEach(track => {
                    const div = document.createElement('div');
                    const img = document.createElement('img');

                    img.src = track.image[2]['#text'];

                    div.appendChild(img);
                    div.appendChild(document.createTextNode(`${track.name} by ${track.artist}`));

                    div.addEventListener('click', function () {
                        document.getElementById('search-bar').innerHTML = `
                            <h2 id="music-name">${track.name} by ${track.artist}</h2>
                            <img src="${track.image[2]['#text']}" alt="${track.name}">
                            <form action="/create-post" method="post">
                                <input id="texto" name="texto" type="text">
                                <input id="musicName" name="musicName" type="hidden" value="${track.name}">
                                <button type="submit" class="botão-criarpost">Postar</button>
                            </form>
                        `;
                    });
                    document.getElementById('search-results').appendChild(div);
                });
            })
    });

}

document.querySelector('.botão-criarpost').addEventListener('click', function () {
    document.getElementById('search-bar').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
    searchFunction();
});

document.getElementById('overlay').addEventListener('click', function () {
    document.getElementById('search-bar').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
});
