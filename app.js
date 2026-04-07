// @ts-nocheck
'use strict';

playlists = this.loadFromStorage();

saveToStorage() {
    localStorage.setItem('playlists', JSON.stringify(this.playlists));
}

loadFromStorage() {
    const saved = localStorage.getItem('playlists');
    return saved ? JSON.parse(saved) : [];
}

this.playlists.push(playlist);
this.saveToStorage();

this.playlists = this.playlists.filter(p => p.id !== id);
this.saveToStorage();


playlist.songs.push(song);
this.saveToStorage();


playlist.songs = playlist.songs.filter(s => s.id !== songId);
this.saveToStorage(); 