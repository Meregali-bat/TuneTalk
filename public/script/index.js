let divCharts = document.querySelector('#charts-artistas');
let api_key = 'a5561aa7b177803b3712501bc8aade9b';

const url = `http://ws.audioscrobbler.com/2.0/?method=geo.gettopartists&country=brazil&api_key=${api_key}&format=json`;

try {
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
} catch (error) {
	console.error(error);
}

document.querySelector('.botão-criarpost').addEventListener('click', function() {
    document.getElementById('search-bar').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
});

document.getElementById('search-input').addEventListener('input', function(e) {
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

                // Adiciona o elemento de imagem ao elemento div
                div.appendChild(img);

                // Adiciona o texto ao elemento div
                div.appendChild(document.createTextNode(`${track.name} by ${track.artist}`));

                document.getElementById('search-results').appendChild(div);
            });
        })
        .catch(error => {
            console.error('Error:', error);
        });
}); 

document.getElementById('overlay').addEventListener('click', function() {
    document.getElementById('search-bar').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
});