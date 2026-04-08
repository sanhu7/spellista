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
            emoji: '🎵',
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
}