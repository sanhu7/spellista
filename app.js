'use strict';

class PlaylistModel {
    playlists = [];
    nextId = 1;
    nextSongId = 1;
    listeners = [];

    constructor() {
        console.log('PlaylistModel skapad!');
    }
}