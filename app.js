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
}