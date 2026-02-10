import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export class Player {
    constructor(game) {
        this.game = game;
        this.camera = game.camera;
        this.scene = game.scene;
        this.physicsWorld = game.physicsWorld;

        // Critical for FPS: Yaw then Pitch
        this.camera.rotation.order = 'YXZ';

        this.moveState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };

        this.canJump = false;
        this.speed = 5;

        // Controls
        this.controls = new PointerLockControls(this.camera, document.body);

        // Physics Body
        const radius = 1;
        const shape = new CANNON.Sphere(radius);
        this.body = new CANNON.Body({
            mass: 5, // kg
            shape: shape,
            linearDamping: 0.9 // Friction like effect for movement
        });
        this.body.position.set(0, 5, 0); // Start in air
        this.physicsWorld.addBody(this.body);

        // Weapon (Visual)
        this.weaponGroup = new THREE.Group();
        this.createWeapon();
        this.camera.add(this.weaponGroup);
        // Position weapon relative to camera
        this.weaponGroup.position.set(0.3, -0.3, -0.5);
        this.scene.add(this.camera); // Add camera to scene so weapon is visible

        this.health = 100;
        this.health = 100;
        this.shakeIntensity = 0;
        this.targetRecoilPitch = 0;
        this.recoilPitch = 0;

        this.setupInput();
    }

    createWeapon() {
        this.weaponGroup = new THREE.Group();

        // Materials
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0xC0C0C0, // Silver
            metalness: 0.9,
            roughness: 0.2
        });
        const woodMat = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // Dark Wood
            roughness: 0.8
        });

        // Cleaned up previous internal function
        // Left Gun
        this.leftGun = this.createRevolverWithArm(false, metalMat, woodMat);
        this.weaponGroup.add(this.leftGun);

        // Right Gun
        this.rightGun = this.createRevolverWithArm(true, metalMat, woodMat);
        this.weaponGroup.add(this.rightGun);

        this.camera.add(this.weaponGroup);
        // Position the whole group 
        this.weaponGroup.position.set(0, -0.1, 0); // Tweaked
        this.scene.add(this.camera);

        // Tilt guns slightly inward for "Dual Wield" look
        this.rightGun.rotation.y = -0.1;
        this.rightGun.rotation.z = -0.1;

        this.leftGun.rotation.y = 0.1;
        this.leftGun.rotation.z = 0.1;

        this.scene.add(this.camera);

        // State for alternating fire
        this.nextGunRight = true;
    }

    createRevolverWithArm(isRight, metalMat, woodMat) {
        const group = new THREE.Group();

        // 1. Grip
        const gripBox = new THREE.BoxGeometry(0.04, 0.12, 0.05);
        const grip = new THREE.Mesh(gripBox, woodMat);
        grip.rotation.x = 0.6;
        grip.position.set(0, -0.06, 0.08);
        group.add(grip);

        // 2. Body
        const bodyBox = new THREE.BoxGeometry(0.05, 0.06, 0.12);
        const body = new THREE.Mesh(bodyBox, metalMat);
        body.position.set(0, 0.02, -0.02);
        group.add(body);

        // 3. Cylinder
        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 8), metalMat);
        cylinder.rotation.x = Math.PI / 2;
        cylinder.position.set(0, 0.02, -0.02);
        group.add(cylinder);

        // 4. Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8), metalMat);
        barrel.rotation.x = -Math.PI / 2;
        barrel.position.set(0, 0.05, -0.2);
        group.add(barrel);

        // 5. Hammer
        const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.02, 0.01), metalMat);
        hammer.position.set(0, 0.06, 0.05);
        group.add(hammer);

        // 6. ARM / SLEEVE
        const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x554433 }); // Brown coat
        const armGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.6, 8);
        const arm = new THREE.Mesh(armGeo, sleeveMat);
        // Arm comes from back (+Z local)
        arm.rotation.x = -Math.PI / 2;
        arm.position.set(0, -0.05, 0.4); // Behind grip
        group.add(arm);

        // Hand (Skin)
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xD2B48C });
        const handGeo = new THREE.BoxGeometry(0.06, 0.06, 0.08);
        const hand = new THREE.Mesh(handGeo, skinMat);
        hand.position.set(0, -0.02, 0.1);
        group.add(hand);

        // Side positioning
        const side = isRight ? 1 : -1;

        // "Human" positioning: 
        // Wider stance (shoulders): 0.45
        // Lower: -0.35
        // Forward/Back: -0.5 (Arms extend)
        group.position.set(side * 0.45, -0.35, -0.55);

        // Rotation: Point parallel or slightly converged
        group.rotation.y = -side * 0.05; // Almost parallel

        return group;
    }

    setupInput() {
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': this.moveState.forward = true; break;
                case 'ArrowLeft':
                case 'KeyA': this.moveState.left = true; break;
                case 'ArrowDown':
                case 'KeyS': this.moveState.backward = true; break;
                case 'ArrowRight':
                case 'KeyD': this.moveState.right = true; break;
                case 'Space':
                    if (this.canJump) {
                        this.body.velocity.y = 8; // Higher jump for gravity
                        this.canJump = false;
                    }
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW': this.moveState.forward = false; break;
                case 'ArrowLeft':
                case 'KeyA': this.moveState.left = false; break;
                case 'ArrowDown':
                case 'KeyS': this.moveState.backward = false; break;
                case 'ArrowRight':
                case 'KeyD': this.moveState.right = false; break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Shooting
        document.addEventListener('mousedown', (event) => {
            if (this.controls.isLocked) {
                this.shoot();
            }
        });

        // Single Weapon Mode
        this.currentWeapon = 'revolver';
        this.ownedWeapons = ['revolver'];
        this.money = 0;
        this.kills = 0;
        this.level = 1;
        this.lastShootTime = 0;

        this.weaponCatalog = {
            revolver: {
                name: 'Два Кольта',
                price: 0,
                damage: 100,
                rate: 600,
                spread: 0.01,
                magSize: 12, // 6 each
                color: 0xC0C0C0,
                desc: "Баланс. 12 Патронов."
            },
            winchester: {
                name: 'Винчестер',
                price: 500,
                damage: 200,
                rate: 900,
                spread: 0.001,
                magSize: 8,
                color: 0x8B4513,
                desc: "Точность. 8 Патронов."
            },
            sawedoff: {
                name: 'Обрез Дробовика',
                price: 1200,
                damage: 50,
                rate: 1500,
                spread: 0.15,
                pellets: 8,
                magSize: 2,
                color: 0x333333,
                desc: "Убойная мощь вблизи."
            },
            gatling: {
                name: 'Пулемет Гатлинга',
                price: 3000,
                damage: 40,
                rate: 100,
                spread: 0.05,
                magSize: 100,
                color: 0x556B2F,
                desc: "Свинцовый дождь."
            },
            random: {},
            volcanic: {
                name: 'Пистолет Волканик',
                price: 800,
                damage: 120,
                rate: 300,
                spread: 0.05,
                magSize: 10,
                color: 0x444444,
                desc: "Скорострельный."
            },
            golden: {
                name: 'Золотой Пистолет',
                price: 10000,
                damage: 9999,
                rate: 400,
                spread: 0.0,
                magSize: 1,
                color: 0xFFD700,
                desc: "Один выстрел - один труп."
            }
        };

        // Initialize Ammo
        this.currentAmmo = 12; // Start with revolver default
        this.isReloading = false;
        this.dryFireCount = 0;

        this.weaponStats = this.weaponCatalog;
        this.updateHUD();
    }

    addKill() {
        this.kills++;

        // Level Logic
        let newLevel = 1;
        if (this.kills >= 50) newLevel = 5;
        else if (this.kills >= 30) newLevel = 4;
        else if (this.kills >= 15) newLevel = 3;
        else if (this.kills >= 5) newLevel = 2;

        if (newLevel > this.level) {
            this.level = newLevel;
            // alert(`LEVEL UP! You are now Level ${this.level}. Money x${this.getLevelMultiplier()}`);
            this.game.showLevelUpNotification(this.level, this.getLevelMultiplier());
        }

        // Money Logic
        const baseReward = 100;
        this.money += baseReward * this.getLevelMultiplier();
        this.updateHUD();
    }

    getLevelMultiplier() {
        const Multipliers = [1, 1.2, 1.5, 2.0, 3.0];
        return Multipliers[this.level - 1] || 3.0;
    }

    buyWeapon(key) {
        const item = this.weaponCatalog[key];
        if (!item) return;

        if (this.ownedWeapons.includes(key)) {
            // Equip
            this.setWeapon(key);
        } else if (this.money >= item.price) {
            // Buy
            this.money -= item.price;
            this.ownedWeapons.push(key);
            this.setWeapon(key);
            alert(`Purchased ${item.name}!`);
        } else {
            alert("Not enough cash, stranger!");
        }
        this.updateHUD();
    }

    reload() {
        if (this.isReloading) return;

        const stats = this.weaponCatalog[this.currentWeapon];
        if (this.currentAmmo === stats.magSize) return; // Full already

        this.isReloading = true;

        // UI Feedback
        const hud = document.getElementById('player-stats');
        if (hud) {
            const existing = hud.innerHTML;
            hud.innerHTML = existing + `<div style="color: red; blink: true;">RELOADING...</div>`;
        }

        // Visual: Lower weapon
        const originalY = this.weaponGroup.position.y;
        this.weaponGroup.position.y -= 0.2;

        setTimeout(() => {
            this.currentAmmo = stats.magSize;
            this.isReloading = false;
            this.dryFireCount = 0; // Reset bad luck
            this.weaponGroup.position.y = originalY;
            this.updateHUD();
        }, 2000); // 2 Second reload time
    }

    updateHUD() {
        const hud = document.getElementById('player-stats');
        const stats = this.weaponCatalog[this.currentWeapon];
        if (hud && stats) {
            hud.innerHTML = `
                <div style="display: flex; justify-content: space-between; width: 300px;">
                    <div style="color: #ff3333; text-shadow: 2px 2px 0 #000;">
                        ❤️ ${Math.ceil(this.health)}
                    </div>
                     <div style="color: gold;">$${this.money}</div>
                </div>
                <div style="margin-top: 5px; font-size: 20px;">Уровень: ${this.level} (💀 ${this.kills})</div>
                <div style="margin-top: 5px; color: #ccc;">Оружие: ${stats.name}</div>
                <div style="font-size: 32px; font-weight: bold; margin-top: 5px; color: ${this.currentAmmo <= 3 ? 'red' : 'white'}">
                    💥 ${this.currentAmmo} / ${stats.magSize}
                </div>
                ${this.currentAmmo === 0 ? '<div style="color:red; font-size:24px; font-weight:bold; blink:true; margin-top:10px;">ЖМИ [R] - ПЕРЕЗАРЯДКА!</div>' : ''}
                ${this.currentAmmo === 1 ? '<div style="position:fixed; top:40%; left:0; width:100%; text-align:center; color:red; font-size:60px; font-weight:bold; text-shadow:4px 4px black; pointer-events:none; z-index:999;">ПОСЛЕДНИЙ ПАТРОН</div>' : ''}
            `;
        }
    }

    setWeapon(type) {
        if (!this.weaponCatalog[type]) return;
        this.currentWeapon = type;
        const stats = this.weaponCatalog[type];

        // Reset Ammo on switch (or track per gun? Simplify: Refill on switch for now to avoid complexity, or just set to max)
        // User said "sometimes buy or return". Let's give full ammo on purchase, but if swapping, maybe preserve? 
        // For simplicity: Full ammo on equip.
        this.currentAmmo = stats.magSize;
        this.isReloading = false;
        this.dryFireCount = 0;

        // Rebuild Weapon Meshes
        // Clear existing
        while (this.weaponGroup.children.length > 0) {
            this.weaponGroup.remove(this.weaponGroup.children[0]);
        }

        // Re-create Left and Right
        const metalMat = new THREE.MeshStandardMaterial({
            color: stats.color,
            metalness: 0.8,
            roughness: 0.2,
            emissive: type === 'golden' ? 0x332200 : 0x000000
        });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

        this.leftGun = this.createGunMesh(type, false, metalMat, woodMat);
        this.rightGun = this.createGunMesh(type, true, metalMat, woodMat);

        this.weaponGroup.add(this.leftGun);
        this.weaponGroup.add(this.rightGun);

        this.updateHUD();
    }

    createGunMesh(type, isRight, metalMat, woodMat) {
        const group = new THREE.Group();

        // --- Common Grip ---
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.05), woodMat);
        grip.rotation.x = 0.6;
        grip.position.set(0, -0.06, 0.08);
        group.add(grip);

        // --- Common Arm ---
        const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x554433 });
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.6, 8), sleeveMat);
        arm.rotation.x = -Math.PI / 2;
        arm.position.set(0, -0.05, 0.4);
        group.add(arm);

        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.08), new THREE.MeshStandardMaterial({ color: 0xD2B48C }));
        hand.position.set(0, -0.02, 0.1);
        group.add(hand);

        // --- Unique Geometry ---
        if (type === 'revolver' || type === 'golden' || type === 'volcanic') {
            // Cylinder / Revolver Body
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.12), metalMat);
            body.position.set(0, 0.02, -0.02);
            group.add(body);

            const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 8), metalMat);
            cyl.rotation.x = Math.PI / 2; cyl.position.set(0, 0.02, -0.02);
            group.add(cyl);

            const barrelLen = type === 'revolver' ? 0.25 : 0.35;
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, barrelLen, 8), metalMat);
            barrel.rotation.x = -Math.PI / 2; barrel.position.set(0, 0.05, -barrelLen / 2 - 0.05);
            group.add(barrel);

            const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.02, 0.01), metalMat);
            hammer.position.set(0, 0.06, 0.05); group.add(hammer);

        } else if (type === 'winchester') {
            // Long Rifle
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.2), metalMat);
            body.position.set(0, 0.02, -0.05);
            group.add(body);

            const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.3), woodMat);
            stock.position.set(0, 0, 0.2);
            group.add(stock);

            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8), metalMat);
            barrel.rotation.x = -Math.PI / 2; barrel.position.set(0, 0.05, -0.5);
            group.add(barrel);

            // Wood Underbarrel
            const under = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.6), woodMat);
            under.position.set(0, 0.02, -0.4);
            group.add(under);

        } else if (type === 'sawedoff') {
            // Double Barrel
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.15), metalMat);
            body.position.set(0, 0.02, -0.02);
            group.add(body);

            const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), metalMat);
            b1.rotation.x = -Math.PI / 2; b1.position.set(-0.02, 0.04, -0.25);
            group.add(b1);

            const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), metalMat);
            b2.rotation.x = -Math.PI / 2; b2.position.set(0.02, 0.04, -0.25);
            group.add(b2);

        } else if (type === 'gatling') {
            // Gatling
            const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.2), metalMat);
            body.position.set(0, 0, 0); group.add(body);

            // Ring of barrels
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const b = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 8), metalMat);
                b.rotation.x = -Math.PI / 2;
                b.position.set(Math.cos(angle) * 0.04, Math.sin(angle) * 0.04, -0.4);
                group.add(b);
            }
        }

        // Positioning
        const side = isRight ? 1 : -1;

        // Adjust offset based on weapon size
        // Rifle/Gatling are bigger, maybe lower them?
        let yOff = -0.35;
        let zOff = -0.55;
        if (type === 'gatling') { yOff = -0.4; zOff = -0.4; }
        if (type === 'winchester') { zOff = -0.3; } // Longer stock pushes it back

        group.position.set(side * 0.45, yOff, zOff);
        group.rotation.y = -side * 0.05;

        return group;
    }

    shoot() {
        if (!this.controls.isLocked) return;
        if (this.isReloading) return;

        const now = Date.now();
        const stats = this.weaponCatalog[this.currentWeapon];

        // Fire Rate
        const rate = this.currentWeapon === 'revolver' ? stats.rate / 2 : stats.rate;
        if (now - this.lastShootTime < rate) return;
        this.lastShootTime = now;

        // AMMO CHECK
        if (this.currentAmmo <= 0) {
            this.triggerDryFire();
            return;
        }

        this.currentAmmo--;
        this.updateHUD();

        // SOUND
        this.game.soundManager.playShoot(this.currentWeapon);

        // RECOIL KICK
        this.applyRecoil(stats);

        // Visual Kickback
        const activeGun = this.nextGunRight ? this.rightGun : this.leftGun;
        this.nextGunRight = !this.nextGunRight;
        activeGun.position.z += 0.25; // More kick

        // Shooting Raycast
        const shots = stats.pellets || 1;
        let hitSomething = false;
        let killedSomething = false;

        for (let i = 0; i < shots; i++) {
            const raycaster = new THREE.Raycaster();
            const spreadX = (Math.random() - 0.5) * stats.spread;
            const spreadY = (Math.random() - 0.5) * stats.spread;
            raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), this.camera);

            const intersects = raycaster.intersectObjects(this.game.scene.children, true);

            for (let intersect of intersects) {
                let obj = intersect.object;

                if (obj === this.game.player.mesh ||
                    obj.userData.ignoreRaycast ||
                    this.weaponGroup.getObjectById(obj.id)
                ) continue;

                while (obj.parent && !obj.userData.entity) {
                    obj = obj.parent;
                }

                if (obj.userData.entity && obj.userData.entity.takeDamage) {
                    const killed = obj.userData.entity.takeDamage(stats.damage);
                    this.game.spawnParticles(intersect.point, 0xff0000, 5);
                    hitSomething = true;
                    if (killed) killedSomething = true;
                    this.game.soundManager.playHit('body');
                    break;
                } else if (obj.isMesh) {
                    this.game.spawnParticles(intersect.point, 0xffff00, 3);
                    break;
                }
            }
        }

        if (hitSomething) this.showHitMarker(killedSomething);
    }

    applyRecoil(stats) {
        // Kick camera UP
        // Just rotating controls pitch directly
        // PointerLockControls usually handles this via mouse move.
        // We can manually adjust object.rotation.x

        const kick = (stats.damage / 100) * 0.05; // Base kick on damage
        this.targetRecoilPitch += kick;

        // Camera "Shake"
        this.shakeIntensity = kick * 5;
    }

    showHitMarker(killed) {
        const el = document.getElementById('hit-marker');
        if (el) {
            el.style.opacity = 1;
            el.innerHTML = killed ?
                `<svg width="40" height="40" viewBox="0 0 40 40"><line x1="10" y1="10" x2="30" y2="30" stroke="red" stroke-width="4" /><line x1="30" y1="10" x2="10" y2="30" stroke="red" stroke-width="4" /></svg>` :
                `<svg width="40" height="40" viewBox="0 0 40 40"><line x1="15" y1="15" x2="25" y2="25" stroke="white" stroke-width="2" /><line x1="25" y1="15" x2="15" y2="25" stroke="white" stroke-width="2" /></svg>`;

            if (killed) {
                this.game.soundManager.playHit('kill');
                // Heal on Kill (Fixed 5)
                this.heal(5);
            } else {
                // Heal on Hit (1)
                this.heal(1);
            }

            setTimeout(() => {
                el.style.opacity = 0;
            }, 100);
        }
    }

    heal(amount) {
        if (this.health >= 100) return;
        const oldHealth = this.health;
        this.health = Math.min(100, this.health + amount);

        const diff = this.health - oldHealth;
        if (diff > 0) {
            // Visual Float
            const healEl = document.createElement('div');
            healEl.innerText = `+${diff} HP`;
            healEl.style.position = 'absolute';
            healEl.style.color = '#00ff00';
            healEl.style.fontWeight = 'bold';
            healEl.style.fontSize = '24px';
            healEl.style.left = '50%';
            healEl.style.top = '45%'; // Slightly above center
            healEl.style.transform = 'translate(-50%, -50%)';
            healEl.style.pointerEvents = 'none';
            healEl.style.textShadow = '1px 1px black';
            document.body.appendChild(healEl);

            // Animate up
            let op = 1;
            let top = 45;
            const anim = setInterval(() => {
                op -= 0.05;
                top -= 0.5;
                healEl.style.opacity = op;
                healEl.style.top = top + '%';
                if (op <= 0) {
                    clearInterval(anim);
                    healEl.remove();
                }
            }, 50);

            // Update New UI
            const healthVal = document.getElementById('health-value');
            if (healthVal) healthVal.innerText = Math.ceil(this.health);
        }
    }

    triggerDryFire() {
        console.log("CLICK! No Ammo.");
        this.game.soundManager.playClick();
        this.dryFireCount++;

        const warning = document.createElement('div');
        warning.innerText = "*CLICK*";
        warning.style.position = 'absolute';
        warning.style.top = '50%'; warning.style.left = '50%';
        warning.style.transform = 'translate(-50%, -50%)';
        warning.style.color = '#fff';
        warning.style.fontSize = '40px';
        warning.style.pointerEvents = 'none';
        document.body.appendChild(warning);
        setTimeout(() => warning.remove(), 200);

        if (this.dryFireCount >= 3) {
            this.explodeWeapon();
        }
    }

    explodeWeapon() {
        if (this.game.state === 'GAMEOVER') return;
        this.game.state = 'GAMEOVER';

        // 1. Detach Weapon from Camera
        const camPos = new THREE.Vector3();
        const camQuat = new THREE.Quaternion();
        this.camera.getWorldPosition(camPos);
        this.camera.getWorldQuaternion(camQuat);

        // Remove from camera, add to scene
        // We need to clone or move. Moving is better.
        this.weaponGroup.removeFromParent();
        this.game.scene.add(this.weaponGroup);

        // Restore World Transform
        this.weaponGroup.position.copy(camPos);
        // Adjust local offset (since it was 0.3, -0.3, -0.5 relative to cam)
        const offset = new THREE.Vector3(0, -0.3, -0.5);
        offset.applyQuaternion(camQuat);
        this.weaponGroup.position.add(offset);
        this.weaponGroup.quaternion.copy(camQuat); // Roughly facing forward

        // 2. Explosion Effect (Particles)
        this.game.spawnParticles(this.weaponGroup.position, 0xff0000, 50); // Blood/Fire
        this.game.spawnParticles(this.weaponGroup.position, 0xffaa00, 30); // Fire

        // 3. Animate "Flying Arm"
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);

        const flyVelocity = dir.multiplyScalar(10); // Fly forward fast
        flyVelocity.y += 5; // Up arc

        let time = 0;
        const animateFly = () => {
            if (time > 3.0) return; // Stop after 3s

            const dt = 0.016;
            time += dt;

            // Move
            this.weaponGroup.position.addScaledVector(flyVelocity, dt);

            // Gravity
            flyVelocity.y -= 9.8 * dt;

            // Tumble
            this.weaponGroup.rotation.x += 5 * dt;
            this.weaponGroup.rotation.z += 2 * dt;

            requestAnimationFrame(animateFly);
        };
        animateFly();

        // 4. Delayed Game Over Screen
        this.triggerGameOverScreen("ОРУЖИЕ ВЗОРВАЛОСЬ", "Следи за состоянием оружия, ковбой.");
    }

    // Helper for arm alignment visual tweak
    updateArmPosition() {
        // Not used currently, but good for dynamic sway
    }

    update(dt) {
        // Sync Camera to Body
        this.camera.position.copy(this.body.position);

        if (this.shakeIntensity > 0) {
            const rx = (Math.random() - 0.5) * this.shakeIntensity;
            const ry = (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.x += rx;
            this.camera.position.y += ry;
            this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 5); // Decay
        }

        this.updateRecoil(dt);

        // Recover Weapon Kick (Per Gun)
        const recoverGun = (gun, baseX, baseY, baseZ) => {
            if (!gun) return;
            if (gun.currentRecoil > 0) {
                gun.position.z = baseZ + gun.currentRecoil; // Recoil back
                gun.rotation.x = -gun.currentRecoil * 2; // Muzzle climb
                gun.currentRecoil -= dt * 2; // Recovery speed
            } else {
                gun.currentRecoil = 0;
                gun.position.z = THREE.MathUtils.lerp(gun.position.z, baseZ, dt * 10);
                gun.rotation.x = THREE.MathUtils.lerp(gun.rotation.x, 0, dt * 10);
            }
        };

        // Note: Base positions from createRevolvers: 
        // Right: 0.25, -0.2, -0.4
        // Left: -0.25, -0.2, -0.4
        if (this.rightGun) recoverGun(this.rightGun, 0.25, -0.2, -0.4);
        if (this.leftGun) recoverGun(this.leftGun, -0.25, -0.2, -0.4);

        // Move Body based on Camera Direction
        // We only want horizontal direction

        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();

        // Get direction from camera
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        // Calculate velocity vector
        const velocity = new THREE.Vector3();

        if (this.moveState.forward) velocity.add(forward);
        if (this.moveState.backward) velocity.sub(forward);
        if (this.moveState.left) velocity.sub(right);
        if (this.moveState.right) velocity.add(right);

        if (velocity.lengthSq() > 0) {
            velocity.normalize();
            velocity.multiplyScalar(this.speed);
        }

        // Apply to body velocity (keeping Y velocity for gravity)
        this.body.velocity.x = velocity.x;
        this.body.velocity.z = velocity.z;

        // Check ground contact (simple)
        // If (velocity.y ~ 0) canJump = true? 
        // Better: raycast down or contact event. 
        // Simplification for now:
        if (Math.abs(this.body.velocity.y) < 0.1) {
            this.canJump = true;
        }
    }

    updateRecoil(dt) {
        // Camera Recoil Logic
        if (this.targetRecoilPitch > 0) {
            const amount = this.targetRecoilPitch * dt * 10;
            this.camera.rotation.x += amount;
            this.targetRecoilPitch -= dt * 5;
            if (this.targetRecoilPitch < 0) this.targetRecoilPitch = 0;
        }

        // CLAMP PITCH
        const limit = 1.5;
        this.camera.rotation.x = Math.max(-limit, Math.min(limit, this.camera.rotation.x));

        // Force Z (Roll) to 0 unless dead
        if (this.health > 0) {
            this.camera.rotation.z = 0;
            // Also ensure Quaternion doesn't drift
            this.camera.rotation.order = 'YXZ';
        }
    }

    takeDamage(amount) {
        if (this.game.state === 'GAMEOVER') return;

        this.health = Math.max(0, this.health - amount);

        // Update New UI
        const healthVal = document.getElementById('health-value');
        if (healthVal) healthVal.innerText = Math.ceil(this.health);

        // Red Flash
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0'; overlay.style.left = '0';
        overlay.style.width = '100%'; overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        overlay.style.pointerEvents = 'none';
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 100);

        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        if (this.game.state === 'GAMEOVER') return;
        this.game.state = 'GAMEOVER';

        // Disable controls
        this.controls.unlock();

        // Fall down animation
        let fallAngle = 0;
        const animateFall = () => {
            if (fallAngle < Math.PI / 2) {
                fallAngle += 0.05;
                this.camera.rotation.z = -fallAngle;
                this.camera.position.y -= 0.05;
                requestAnimationFrame(animateFall);
            }
        };
        animateFall();

        this.triggerGameOverScreen("ВЫ ПОГИБЛИ", "Прах к праху...");
    }

    triggerGameOverScreen(title, subtitle) {
        setTimeout(() => {
            // Force Unlock
            if (document.pointerLockElement) document.exitPointerLock();
            this.controls.unlock();

            // Hide Crosshair
            const crosshair = document.getElementById('crosshair');
            if (crosshair) crosshair.style.display = 'none';
            document.body.style.cursor = 'default';

            const blood = document.createElement('div');
            blood.style.position = 'absolute';
            blood.style.top = '0'; blood.style.left = '0';
            blood.style.width = '100%'; blood.style.height = '100%';
            blood.style.backgroundColor = 'rgba(100, 0, 0, 0.0)';
            blood.style.transition = 'background-color 3s';
            blood.style.display = 'flex';
            blood.style.flexDirection = 'column';
            blood.style.alignItems = 'center';
            blood.style.justifyContent = 'center';
            blood.style.zIndex = '99999'; // Super high Z
            blood.style.pointerEvents = 'auto';
            blood.style.cursor = 'default';

            // Title
            const h1 = document.createElement('h1');
            h1.innerText = 'КОНЕЦ ИГРЫ';
            h1.style.fontSize = '80px';
            h1.style.color = 'black';
            h1.style.fontFamily = "'Courier New', sans-serif";
            h1.style.textAlign = 'center';
            h1.style.textShadow = '2px 2px red';
            h1.style.userSelect = 'none';
            blood.appendChild(h1);

            // Subtitle
            const h2 = document.createElement('h2');
            h2.innerText = title;
            h2.style.fontSize = '30px';
            h2.style.color = 'white';
            h2.style.textAlign = 'center';
            h2.style.maxWidth = '800px';
            h2.style.textShadow = '1px 1px black';
            blood.appendChild(h2);

            // Description
            const desc = document.createElement('div');
            desc.innerText = subtitle;
            desc.style.fontSize = '20px';
            desc.style.color = '#ccc';
            desc.style.marginTop = '10px';
            blood.appendChild(desc);

            // Button
            const btn = document.createElement('button');
            btn.innerText = 'ПОПРОБОВАТЬ СНОВА';
            btn.style.marginTop = '50px';
            btn.style.padding = '20px';
            btn.style.fontSize = '24px';
            btn.style.cursor = 'pointer';
            btn.style.border = '2px solid white';
            btn.style.background = 'darkred';
            btn.style.color = 'white';

            btn.addEventListener('click', () => {
                window.location.reload();
            });

            blood.appendChild(btn);
            document.body.appendChild(blood);

            // Fade in
            requestAnimationFrame(() => {
                blood.style.backgroundColor = 'rgba(50, 0, 0, 0.8)';
            });
        }, 1000);
    }
}
