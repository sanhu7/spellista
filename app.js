'use strict';

const { listeners } = require("node:cluster");

class PlaylistModel {
    playlists = [];
    nextId = 1;
    nextSongId = 1;
    listeners = [];

    constructor() {
        console.log('PlaylistModel skapad!');
    }


    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify(event, data) {
        this.listeners.forEach(fn => fn(event, data));
    }
}