import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Player } from './Player.js';
import { World } from './World.js';
import { Enemy } from './Enemy.js';
import { Minimap } from './Minimap.js';
import { DialogueSystem } from './DialogueSystem.js';
import { SoundManager } from './SoundManager.js';

export class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.soundManager = new SoundManager();
        this.lastTime = 0;
        this.enemies = [];
        this.state = 'MENU';

        this.initThree();
        this.initPhysics();
        this.initGameObjects();
        this.setupEventListeners();
    }

    initThree() {
        // Scene
        // Scene
        this.scene = new THREE.Scene();
        // Golden Hour: Light Salmon Sky
        this.scene.background = new THREE.Color(0xFFA07A);

        // Fog - Warm Coral (Sunset Haze)
        this.scene.fog = new THREE.Fog(0xFF7F50, 20, 100);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Bright Daylight Ambient
        this.scene.add(ambientLight);

        // Sunset Sun (Low angle, bright)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(-80, 40, -50);
        dirLight.castShadow = true;

        // Optimize Shadows for large maze
        dirLight.shadow.mapSize.width = 4096;
        dirLight.shadow.mapSize.height = 4096;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 300;
        dirLight.shadow.camera.left = -150;
        dirLight.shadow.camera.right = 150;
        dirLight.shadow.camera.top = 150;
        dirLight.shadow.camera.bottom = -150;
        this.scene.add(dirLight);

        // Visual Sun (Disk on horizon)
        const sunGeo = new THREE.CircleGeometry(25, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFFFE0 }); // Light Yellow Sun
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.copy(dirLight.position).normalize().multiplyScalar(200);
        sun.lookAt(0, 0, 0);
        this.scene.add(sun);
    }

    initPhysics() {
        this.physicsWorld = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0),
        });

        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
            friction: 0.1,
            restitution: 0
        });
        this.physicsWorld.addContactMaterial(defaultContactMaterial);
    }

    initGameObjects() {
        this.world = new World(this);
        this.player = new Player(this);
        this.minimap = new Minimap(this);
        this.dialogueSystem = new DialogueSystem(this);

        // Move Player to Maze Start
        if (this.world.startPos) {
            this.player.body.position.copy(this.world.startPos);
            this.player.body.velocity.set(0, 0, 0);
        }
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Shop Toggle
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyG') {
                if (this.state === 'PLAYING') {
                    this.openShop();
                } else if (this.state === 'SHOP') {
                    this.closeShop();
                }
            }
            if (e.code === 'KeyR' && this.state === 'PLAYING') {
                this.player.reload();
            }
            if (e.code === 'KeyT') {
                this.dialogueSystem.toggle();
            }
            if (e.code === 'Escape' && this.state === 'SHOP') {
                this.closeShop();
            }
        });

        // UI Elements
        const btnStart = document.getElementById('btn-start');
        const btnDiff = document.getElementById('btn-diff');
        const btnExit = document.getElementById('btn-exit');
        const menu = document.getElementById('main-menu');

        this.menuItems = [btnStart, btnDiff, btnExit].filter(b => b); // Filter nulls
        this.selectedMenuIndex = 0;
        this.difficulty = 'NORMAL';

        if (this.menuItems.length > 0) {
            this.updateMenuVisuals();
        }

        // Keyboard Navigation
        document.addEventListener('keydown', (e) => {
            if (this.state === 'MENU') {
                if (['ArrowUp', 'KeyW'].includes(e.code)) {
                    this.selectedMenuIndex = (this.selectedMenuIndex - 1 + this.menuItems.length) % this.menuItems.length;
                    this.updateMenuVisuals();
                }
                if (['ArrowDown', 'KeyS'].includes(e.code)) {
                    this.selectedMenuIndex = (this.selectedMenuIndex + 1) % this.menuItems.length;
                    this.updateMenuVisuals();
                }
                if (['Enter', 'Space'].includes(e.code)) {
                    this.triggerMenuAction();
                }
            }
        });

        // Mouse Hover & Click
        this.menuItems.forEach((btn, index) => {
            if (!btn) return;
            btn.addEventListener('mouseenter', () => {
                if (this.state === 'MENU') {
                    this.selectedMenuIndex = index;
                    this.updateMenuVisuals();
                }
            });
            btn.addEventListener('click', () => {
                if (this.state === 'MENU') {
                    this.selectedMenuIndex = index;
                    this.triggerMenuAction(btn); // Direct pass
                }
            });
        });

        // Pointer Lock Listener
        this.player.controls.addEventListener('unlock', () => {
            // Only go to Main Menu if we are PLAYING or PAUSED, not if we opened a UI
            if (this.state === 'PLAYING' && this.state !== 'SHOP' && this.state !== 'DIALOGUE' && this.player.health > 0) {
                // Actually, if we just unlocked, we might be PAUSED.
                // But if we unlock FOR Shop/Dialogue, we set state BEFORE unlocking usually?
                // Let's check the state explicitly.

                // If the state is ALREADY 'SHOP' or 'DIALOGUE', do NOT show menu.
                // The 'unlock' event happens async after we call .unlock().
            }

            // Better logic:
            if (this.state === 'PLAYING' && this.player.health > 0) {
                if (menu) menu.style.display = 'flex';
                this.state = 'MENU';
            }
            // If state is 'SHOP' or 'DIALOGUE', do nothing (stay in that state)
        });
    }

    updateMenuVisuals() {
        this.menuItems.forEach((btn, index) => {
            if (index === this.selectedMenuIndex) {
                btn.classList.add('selected');
                btn.style.borderColor = '#ffaa00';
                btn.style.backgroundColor = '#a0522d';
            } else {
                btn.classList.remove('selected');
                btn.style.borderColor = '#5a2e0c';
                btn.style.backgroundColor = '#8b4513';
            }
        });
    }

    triggerMenuAction(clickedBtn = null) {
        const btn = clickedBtn || this.menuItems[this.selectedMenuIndex];
        if (!btn) return;

        if (btn.id === 'btn-start') {
            try {
                this.startGame();
            } catch (e) {
                console.error("Start Game Failed:", e);
                alert("Game Start Error: " + e.message);
            }
        }
        else if (btn.id === 'btn-diff') {
            this.cycleDifficulty(btn);
        }
        else if (btn.id === 'btn-exit') {
            alert("To exit, close the tab.");
        }
    }

    startGame() {
        const menu = document.getElementById('main-menu');
        const crosshair = document.getElementById('crosshair');

        if (menu) menu.style.display = 'none';

        // Show HUD
        ['score', 'health', 'weapon'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'block';
        });
        if (crosshair) crosshair.style.display = 'block';

        this.state = 'PLAYING';

        try {
            this.player.controls.lock();
            this.spawnInitialEnemies();
        } catch (e) {
            console.error("Spawn Failed:", e);
        }
    }

    cycleDifficulty(btn) {
        const diffs = ['EASY', 'NORMAL', 'HARD'];
        const labels = { 'EASY': 'ЛЕГКО', 'NORMAL': 'НОРМАЛЬНО', 'HARD': 'СЛОЖНО' };

        let currIdx = diffs.indexOf(this.difficulty);
        if (currIdx === -1) currIdx = 1;

        currIdx = (currIdx + 1) % diffs.length;
        this.difficulty = diffs[currIdx];
        btn.innerText = labels[this.difficulty];
    }

    spawnInitialEnemies() {
        // Clear old
        this.enemies.forEach(e => {
            this.scene.remove(e.mesh);
            this.physicsWorld.removeBody(e.body);
        });
        this.enemies = [];

        // Maze Spawning
        const spawns = this.world.spawnPoints || [];
        console.log("Spawn Points Available:", spawns.length);

        if (spawns.length === 0) {
            console.warn("No spawn points found! Spawning randomly.");
            for (let i = 0; i < 5; i++) {
                this.spawnEnemy(); // Fallback
            }
            return;
        }

        // Shuffle
        for (let i = spawns.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [spawns[i], spawns[j]] = [spawns[j], spawns[i]];
        }

        const count = Math.min(spawns.length, this.difficulty === 'EASY' ? 10 : (this.difficulty === 'NORMAL' ? 30 : 60));

        for (let i = 0; i < count; i++) {
            const pt = spawns[i];
            this.spawnEnemyAt(pt.x, pt.z);
        }
        console.log("Spawned", this.enemies.length, "enemies.");
    }

    spawnEnemyAt(x, z) {
        const enemy = new Enemy(this, x, 0, z);
        this.enemies.push(enemy);
    }

    spawnEnemy() {
        // Deprecated or random reinforcement
        if (this.world.spawnPoints && this.world.spawnPoints.length > 0) {
            const pt = this.world.spawnPoints[Math.floor(Math.random() * this.world.spawnPoints.length)];
            this.spawnEnemyAt(pt.x, pt.z);
        }
    }

    winGame() {
        if (this.state === 'WON') return;
        this.state = 'WON';

        // Force unlock
        if (document.pointerLockElement) document.exitPointerLock();
        this.player.controls.unlock();

        document.body.style.cursor = 'default';
        const crosshair = document.getElementById('crosshair');
        if (crosshair) crosshair.style.display = 'none';

        // Win UI
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0'; overlay.style.left = '0';
        overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 215, 0, 0.5)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '99999';
        overlay.style.pointerEvents = 'auto';
        overlay.style.cursor = 'default';

        // Title
        const h1 = document.createElement('h1');
        h1.innerText = 'МИССИЯ ВЫПОЛНЕНА';
        h1.style.fontSize = '80px';
        h1.style.color = 'white';
        h1.style.textShadow = '4px 4px 0 #000';
        h1.style.textAlign = 'center';
        overlay.appendChild(h1);

        // Subtitle
        const h2 = document.createElement('h2');
        h2.innerText = 'Вы нашли Золотой Значок!';
        h2.style.color = '#fff';
        h2.style.fontSize = '40px';
        h2.style.textShadow = '2px 2px 0 #000';
        h2.style.textAlign = 'center';
        overlay.appendChild(h2);

        // Button
        const btn = document.createElement('button');
        btn.innerText = 'ИГРАТЬ СНОВА';
        btn.style.padding = '20px 40px';
        btn.style.fontSize = '30px';
        btn.style.marginTop = '30px';
        btn.style.cursor = 'pointer';
        btn.style.border = '2px solid white';
        btn.style.background = '#daa520';
        btn.style.color = 'black';

        btn.addEventListener('click', () => {
            window.location.reload();
        });

        overlay.appendChild(btn);
        document.body.appendChild(overlay);

        this.player.controls.unlock();
    }

    spawnParticles(position, color, count) {
        const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const mat = new THREE.MeshBasicMaterial({ color: color });

        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(position);
            mesh.position.x += (Math.random() - 0.5) * 0.5;
            mesh.position.y += (Math.random() - 0.5) * 0.5;
            mesh.position.z += (Math.random() - 0.5) * 0.5;
            mesh.userData.ignoreRaycast = true; // Fix: particles won't block shots
            this.scene.add(mesh);

            let age = 0;
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 5,
                (Math.random() - 0.5) * 5
            );

            const animate = () => {
                age += 0.016;
                if (age > 1.0) {
                    this.scene.remove(mesh);
                    return;
                }
                velocity.y -= 9.8 * 0.016;
                mesh.position.addScaledVector(velocity, 0.016);
                mesh.rotation.x += 0.1;
                mesh.rotation.y += 0.1;
                mesh.material.opacity = 1 - age;
                requestAnimationFrame(animate);
            };
            animate();
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        this.renderer.setAnimationLoop(this.update.bind(this));
    }

    update(time) {
        let dt = (time - this.lastTime) / 1000 || 1 / 60;
        this.lastTime = time;

        // Clamp dt to prevent explosions on lag spikes
        if (dt > 0.1) dt = 0.1;

        this.physicsWorld.step(1 / 60, dt, 3);

        if (this.player) this.player.update(dt);
        if (this.world) this.world.update(dt);
        if (this.minimap) this.minimap.update();

        // Update enemies
        this.enemies.forEach(enemy => enemy.update(dt));

        // Spawn logic only when playing
        if (this.state === 'PLAYING') {
            const limit = this.difficulty === 'EASY' ? 3 : (this.difficulty === 'NORMAL' ? 5 : 10);
            if (Math.random() < 0.005 && this.enemies.length < limit) {
                this.spawnEnemy();
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    openShop() {
        this.state = 'SHOP';
        this.player.controls.unlock();
        const menu = document.getElementById('shop-menu');
        if (menu) {
            menu.style.display = 'block';
            this.renderShopItems();
        }
    }

    closeShop() {
        this.state = 'PLAYING';
        const menu = document.getElementById('shop-menu');
        if (menu) menu.style.display = 'none';
        this.player.controls.lock();
    }

    showLevelUpNotification(level, multiplier) {
        let el = document.getElementById('level-up');
        if (!el) {
            el = document.createElement('div');
            el.id = 'level-up';
            el.style.position = 'absolute';
            el.style.top = '30%';
            el.style.left = '50%';
            el.style.transform = 'translate(-50%, -50%)';
            el.style.color = '#ffd700';
            el.style.fontSize = '80px';
            el.style.fontWeight = 'bold';
            el.style.textShadow = '4px 4px 0 #000';
            el.style.pointerEvents = 'none';
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.5s';
            el.style.fontFamily = "'Courier New', monospace";
            document.body.appendChild(el);
        }

        el.innerHTML = `LEVEL ${level}<br><span style="font-size: 40px">Money x${multiplier.toFixed(1)}</span>`;
        el.style.opacity = '1';

        // Sound effect visual
        // Blink
        setTimeout(() => el.style.opacity = '0', 3000);
    }

    renderShopItems() {
        const container = document.getElementById('shop-items');
        if (!container) return;
        container.innerHTML = '';

        const catalog = this.player.weaponCatalog;

        for (const [key, item] of Object.entries(catalog)) {
            const owned = this.player.ownedWeapons.includes(key);
            const equipped = this.player.currentWeapon === key;
            const affordable = this.player.money >= item.price;

            const div = document.createElement('div');
            div.style.border = '2px solid ' + (equipped ? '#00ff00' : '#8b4513');
            div.style.background = 'rgba(0,0,0,0.5)';
            div.style.padding = '10px';
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.style.gap = '5px';

            div.innerHTML = `
                <h3 style="color: ${equipped ? '#00ff00' : 'gold'}; margin: 0;">${item.name} ${equipped ? '[В РУКАХ]' : ''}</h3>
                <div style="font-size: 14px; color: #ccc;">${item.desc}</div>
                <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                    <span>Темп: ${item.rate}мс</span>
                    <span>Урон: ${item.damage} ${item.pellets ? 'x8' : ''}</span>
                </div>
                <button id="buy-${key}" style="
                    margin-top: 10px; 
                    padding: 10px; 
                    background: ${owned ? '#556b2f' : (affordable ? '#8b4513' : '#333')}; 
                    color: white; 
                    border: none; 
                    cursor: pointer;
                    font-weight: bold;">
                    ${owned ? (equipped ? 'ЭКИПИРОВАНО' : 'ВЗЯТЬ') : 'КУПИТЬ ($' + item.price + ')'}
                </button>
            `;

            container.appendChild(div);

            // Click Handler
            const btn = div.querySelector(`#buy-${key}`);
            btn.onclick = () => {
                this.player.buyWeapon(key);
                this.renderShopItems(); // Re-render to update money/buttons
            };
        }
    }
}
