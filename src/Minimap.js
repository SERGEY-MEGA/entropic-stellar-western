export class Minimap {
    constructor(game) {
        this.game = game;
        this.isVisible = false;
        this.createUI();
        this.setupControls();
    }

    createUI() {
        this.container = document.createElement('div');
        this.container.id = 'minimap';
        this.container.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            width: 200px;
            height: 200px;
            background: rgba(0, 0, 0, 0.8);
            border: 3px solid #8B4513;
            border-radius: 5px;
            display: none;
            padding: 5px;
            z-index: 1000;
        `;

        this.canvas = document.createElement('canvas');
        this.canvas.width = 230;
        this.canvas.height = 230;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        const label = document.createElement('div');
        label.innerText = 'MAP (M)';
        label.style.cssText = `
            position: absolute;
            top: 5px;
            left: 50%;
            transform: translateX(-50%);
            color: #FFD700;
            font-size: 12px;
            font-weight: bold;
        `;
        this.container.appendChild(label);

        document.body.appendChild(this.container);
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyM') {
                this.toggle();
            }
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'block' : 'none';
    }

    update() {
        if (!this.isVisible || !this.game.world.maze) return;

        const maze = this.game.world.maze;
        const rows = maze.length;
        const cols = maze[0].length;
        const cellW = this.canvas.width / cols;
        const cellH = this.canvas.height / rows;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw maze
        for (let z = 0; z < rows; z++) {
            for (let x = 0; x < cols; x++) {
                const type = maze[z][x];
                const px = x * cellW;
                const py = z * cellH;

                if (type === 1) {
                    this.ctx.fillStyle = '#A0522D';
                    this.ctx.fillRect(px, py, cellW, cellH);
                } else if (type === 2) {
                    this.ctx.fillStyle = '#00FF00';
                    this.ctx.fillRect(px, py, cellW, cellH);
                } else if (type === 3) {
                    this.ctx.fillStyle = '#FFD700';
                    this.ctx.fillRect(px, py, cellW, cellH);
                } else {
                    this.ctx.fillStyle = '#D2B48C';
                    this.ctx.fillRect(px, py, cellW, cellH);
                }
            }
        }

        // Draw player
        if (this.game.player) {
            const playerPos = this.game.player.body.position;
            const cellSize = 12;
            const px = ((playerPos.x / cellSize) + cols / 2) * cellW;
            const py = ((playerPos.z / cellSize) + rows / 2) * cellH;

            this.ctx.fillStyle = '#0000FF';
            this.ctx.beginPath();
            this.ctx.arc(px, py, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw enemies
        this.game.enemies.forEach(enemy => {
            const pos = enemy.body.position;
            const cellSize = 12;
            const ex = ((pos.x / cellSize) + cols / 2) * cellW;
            const ey = ((pos.z / cellSize) + rows / 2) * cellH;

            this.ctx.fillStyle = '#FF0000';
            this.ctx.beginPath();
            this.ctx.arc(ex, ey, 3, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}
