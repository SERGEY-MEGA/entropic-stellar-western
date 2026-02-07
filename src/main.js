import { Game } from './Game.js';

// Wait for DOM
window.addEventListener('DOMContentLoaded', () => {
    // Initialize the game
    const game = new Game();
    game.start();
});
