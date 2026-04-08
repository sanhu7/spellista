'use strict';


const { listeners } = require("node:cluster");

class PlaylistModel {
    playlists = [];
    nextId = 1;
    nextSongId = 1;
    listeners = [];

    constructor() {
        const saved = this.loadFromStorage();
        if (saved.length > 0) {
            this.playlists = saved;
        } else {
            this.seedData();
        }
    }

    //localStorage
    saveToStorage() {
        localStorage.setItem('playlists', JSON.stringify(this.playlists));
    }

    loadFromStorage() {
        const saved = localStorage.getItem('playlists');
        return saved ? JSON.parse(saved) : [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify(event, data) {
        this.listeners.forEach(fn => fn(event, data));
    }

    //create playlist

    createPlaylist(name, description = '') {
        const playlist = {
            id: this.nextId++,
            name: name.trim(),
            description: description.trim(),
            songs: [],
            createdAt: new Date(),
            emoji: this.randomEmoji(),
        };
        this.playlists.push(playlist);
        this.notify('playlistCreated', playlist);
        return playlist;
    }

    //delete playlist
    deletePlaylist(id) {
        this.playlists = this.playlists.filter(p => p.id !== id);
        this.notify('playlistDeleted', id);
    }

    //add song
    addSong(playlistId, { title, artist, genre, duration = '' }) {
        const playlist = this.getById(playlistId);
        if (!playlist) return null;
        const song = {
            id: this.nextSongId++,
            title: title.trim(),
            artist: artist.trim(),
            genre: genre.trim(),
            duration: duration.trim(),
        };
        playlist.songs.push(song);
        this.notify('songAdded', { playlist, song });
        return song;
    }

    //delete song
    deleteSong(playlistId, songId) {
        const playlist = this.getById(playlistId);
        if (!playlist) return;
        playlist.songs = playlist.songs.filter(s => s.id !== songId);
        this.notify('songDeleted', { playlistId, songId });
    }


    //metoder: getById, getAll, getSongsGrouped
    getById(id) {
        return this.playlists.find(p => p.id === id);
    }

    getAll() {
        return [...this.playlists];
    }

    getSongsGrouped(playlistId) {
        const playlist = this.getById(playlistId);
        if (!playlist) return {};
        const grouped = {};
        for (const song of playlist.songs) {
            if (!grouped[song.genre]) grouped[song.genre] = {};
            if (!grouped[song.genre][song.artist]) grouped[song.genre][song.artist] = [];
            grouped[song.genre][song.artist].push(song);
        }
        return grouped;
    }

    //randomemoji,seedData
    randomEmoji() {
        const pool = ['🎵', '🎶', '🎸', '🎹', '🎺', '🥁', '🎷', '🎻', '🎤', '🎧'];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    seedData() {
        const p1 = this.createPlaylist('Favoriter', 'Mina bästa låtar');
        this.addSong(p1.id, { title: 'Bohemian Rhapsody', artist: 'Queen', genre: 'Rock', duration: '5:55' });
        this.addSong(p1.id, { title: 'Blinding Lights', artist: 'The Weeknd', genre: 'Pop', duration: '3:22' });

        const p2 = this.createPlaylist('Träningsmusik', 'Energi för gymmet');
        this.addSong(p2.id, { title: 'Till I Collapse', artist: 'Eminem', genre: 'Hip-Hop', duration: '4:57' });
    }
}

//playlist view
class PlaylistView {
    app;
    main;
    modal = null;

    constructor(appId) {
        this.app = document.getElementById(appId);
        this.buildShell();
    }

    buildShell() {
        this.app.innerHTML = `
      <header class="app-header">
        <div class="header-brand">🎵 Spellista Manager</div>
      </header>
      <aside class="app-sidebar" id="sidebar">
        <div class="sidebar-header">
          <p class="sidebar-title">Spellistor</p>
          <button class="btn-new-playlist" id="btnNewPlaylist">+ Ny Spellista</button>
        </div>
        <div class="playlist-list" id="playlistList"></div>
      </aside>
      <main class="app-main" id="mainContent">
        <div class="welcome-state">
          <h2>Välkommen!</h2>
          <p>Välj eller skapa en spellista.</p>
        </div>
      </main>
    `;
        this.main = document.getElementById('mainContent');
    }

    //sidebar lista
    renderPlaylists(playlists, activeId, filter = '') {
        const list = document.getElementById('playlistList');
        const filtered = filter
            ? playlists.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
            : playlists;

        if (filtered.length === 0) {
            list.innerHTML = `<p style="padding:1rem;color:#888;">Inga spellistor hittades</p>`;
            return;
        }

        list.innerHTML = filtered.map(p => `
      <div class="playlist-item ${p.id === activeId ? 'active' : ''}"
           data-playlist-id="${p.id}">
        <div class="playlist-item-icon">${p.emoji}</div>
        <div class="playlist-item-info">
          <div class="playlist-item-name">${p.name}</div>
          <div class="playlist-item-count">${p.songs.length} låtar</div>
        </div>
      </div>
    `).join('');
    }

    //spellistans detaljer
    renderPlaylistDetail(playlist, grouped) {
        const totalSongs = playlist.songs.length;
        const genres = Object.keys(grouped).length;

        this.main.innerHTML = `
      <section class="playlist-detail">
        <div class="playlist-hero">
          <div class="playlist-cover">${playlist.emoji}</div>
          <div class="playlist-hero-info">
            <p class="playlist-type-label">Spellista</p>
            <h1 class="playlist-hero-name">${playlist.name}</h1>
            <p class="playlist-hero-desc">${playlist.description || 'Ingen beskrivning'}</p>
            <div class="playlist-stats">
              <span><strong>${genres}</strong> genrer</span>
              <span><strong>${totalSongs}</strong> låtar</span>
            </div>
            <div class="playlist-actions">
              <button class="btn btn-primary" id="btnAddSong">+ Lägg till låt</button>
              <button class="btn btn-danger" id="btnDeletePlaylist">🗑 Ta bort lista</button>
            </div>
          </div>
        </div>
        <div id="songTree">
          ${this.buildSongTree(grouped, playlist.id, totalSongs === 0)}
        </div>
      </section>
    `;
    }


    //song tree
    buildSongTree(grouped, playlistId, isEmpty) {
        if (isEmpty) {
            return `<p style="padding:2rem;text-align:center;color:#888;">
        Inga låtar ännu — tryck på <strong>Lägg till låt</strong>!
      </p>`;
        }

        return Object.entries(grouped).map(([genre, artistMap]) => {
            const artistsHTML = Object.entries(artistMap).map(([artist, songs]) => {
                const songsHTML = songs.map((song, i) => `
          <div class="song-row">
            <span class="song-index">${i + 1}</span>
            <span class="song-title">${song.title}</span>
            <span class="song-duration">${song.duration}</span>
            <button class="song-delete"
                    data-delete-song="${song.id}"
                    data-playlist="${playlistId}">✕</button>
          </div>`).join('');

                return `
          <div class="artist-group">
            <div class="artist-header">👤 ${artist}</div>
            <div class="artist-body">${songsHTML}</div>
          </div>`;
            }).join('');

            return `
        <div class="genre-group">
          <div class="genre-header">🎵 ${genre}</div>
          <div class="genre-body">${artistsHTML}</div>
        </div>`;
        }).join('');
    }



    //skapa spellista + lägg till låt
    showCreatePlaylistModal() {
        this.openModal(`
      <h2 class="modal-title">Ny Spellista</h2>
      <form id="modalForm">
        <div class="form-group">
          <label class="form-label">Namn</label>
          <input class="form-input" id="inputName" type="text" placeholder="T.ex. Sommarvibes">
        </div>
        <div class="form-group">
          <label class="form-label">Beskrivning</label>
          <input class="form-input" id="inputDesc" type="text" placeholder="Valfri beskrivning…">
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" data-modal-close>Avbryt</button>
          <button type="submit" class="btn btn-primary">Skapa</button>
        </div>
      </form>
    `);
        document.getElementById('inputName').focus();
        return document.getElementById('modalForm');
    }

    showAddSongModal(playlistId) {
        this.openModal(`
      <h2 class="modal-title">Lägg till låt</h2>
      <form id="modalForm" data-playlist-id="${playlistId}">
        <div class="form-group">
          <label class="form-label">Låttitel</label>
          <input class="form-input" id="songTitle" type="text" placeholder="T.ex. Blinding Lights">
        </div>
        <div class="form-group">
          <label class="form-label">Artist</label>
          <input class="form-input" id="songArtist" type="text" placeholder="T.ex. The Weeknd">
        </div>
        <div class="form-group">
          <label class="form-label">Genre</label>
          <input class="form-input" id="songGenre" type="text" placeholder="T.ex. Pop">
        </div>
        <div class="form-group">
          <label class="form-label">Längd</label>
          <input class="form-input" id="songDuration" type="text" placeholder="T.ex. 3:45">
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" data-modal-close>Avbryt</button>
          <button type="submit" class="btn btn-primary">Lägg till</button>
        </div>
      </form>
    `);
        document.getElementById('songTitle').focus();
        return document.getElementById('modalForm');
    }

    openModal(html) {
        this.hideModal();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal">${html}</div>`;
        document.body.appendChild(overlay);
        this.modal = overlay;
        overlay.addEventListener('click', e => {
            if (e.target === overlay) this.hideModal();
        });
    }

    hideModal() {
        if (this.modal) { this.modal.remove(); this.modal = null; }
    }


    //toast-notis
    showToast(message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}