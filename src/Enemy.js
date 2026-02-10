import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Enemy {
    constructor(game, x, y, z, isBoss = false) {
        this.game = game;
        this.isBoss = isBoss;
        this.health = isBoss ? 1000 : 300;
        this.maxHealth = this.health;
        this.speed = isBoss ? 4.5 : 5.0; // Boss moves heavily
        this.isDead = false;
        this.lastAttack = 0;
        this.recoil = 0; // Visual recoil

        // Visual - Humanoid Group
        this.mesh = new THREE.Group();
        this.mesh.position.set(x, y + 1, z);
        if (this.isBoss) {
            this.mesh.scale.set(1.3, 1.3, 1.3); // Bigger
        }
        this.mesh.userData.entity = this;
        this.game.scene.add(this.mesh);

        // Colors
        const skinColor = 0xd2b48c;
        const shirtColor = this.isBoss ? 0x800000 : (Math.random() > 0.5 ? 0x8b4513 : 0x556b2f); // Boss = Dark Red
        const pantsColor = this.isBoss ? 0x000000 : 0x2f4f4f; // Boss = Black
        const hatColor = this.isBoss ? 0xffffff : 0x1a1a1a; // Boss = White Hat (The Big Boss) OR Blacker? Let's go White for "The Sheriff/Leader" look or All Black. Let's go All Black for Bad Guy Leader.
        // Actually user said "Glavar" (Leader). Let's do Black Hat with Red Band? Or just 0x111111.

        const finalHatColor = this.isBoss ? 0x222222 : 0x1a1a1a;

        const skinMat = new THREE.MeshStandardMaterial({ color: skinColor });
        const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor });
        const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor });
        const hatMat = new THREE.MeshStandardMaterial({ color: finalHatColor });

        // --- Model Construction (Simplified Humanoid) ---
        // Torso
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.23, 0.7, 8), shirtMat);
        torso.position.y = 1.05;
        torso.castShadow = true;
        this.mesh.add(torso);

        // Hips
        const hip = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.2, 0.15, 8), pantsMat);
        hip.position.y = 0.65;
        this.mesh.add(hip);

        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), skinMat);
        head.position.y = 1.55;
        head.userData.part = 'head'; // HEADSHOT TAG
        this.mesh.add(head);

        // Eyes (Direction Indicator)
        const eyeGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat); leftEye.position.set(-0.06, 1.58, 0.12); this.mesh.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat); rightEye.position.set(0.06, 1.58, 0.12); this.mesh.add(rightEye);

        // Hat
        const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.02, 16), hatMat); hatBrim.position.y = 1.6; this.mesh.add(hatBrim);
        const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.15, 16), hatMat); hatTop.position.y = 1.68; this.mesh.add(hatTop);

        // Arms
        const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.35, 8);

        // Right Arm (Weapon)
        this.rArm = new THREE.Group(); this.rArm.position.set(0.3, 1.35, 0); this.mesh.add(this.rArm);
        const rArmMesh = new THREE.Mesh(armGeo, shirtMat); rArmMesh.position.y = -0.15; this.rArm.add(rArmMesh);

        // Weapon Model
        // Weapon Model (Realistic Revolver)
        const gunGroup = new THREE.Group();
        gunGroup.position.set(0, -0.3, 0.1);
        this.rArm.add(gunGroup);

        // Materials
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 });
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });

        // 1. Grip
        const gripBox = new THREE.BoxGeometry(0.04, 0.08, 0.03);
        const grip = new THREE.Mesh(gripBox, woodMat);
        grip.rotation.x = 0.6;
        grip.position.set(0, -0.06, 0.08);
        gunGroup.add(grip);

        // 2. Body
        const bodyBox = new THREE.BoxGeometry(0.05, 0.06, 0.12);
        const body = new THREE.Mesh(bodyBox, metalMat);
        body.position.set(0, 0.02, -0.02);
        gunGroup.add(body);

        // 3. Cylinder
        const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 6), metalMat);
        cylinder.rotation.x = Math.PI / 2;
        cylinder.position.set(0, 0.02, -0.02);
        gunGroup.add(cylinder);

        // 4. Barrel
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8), metalMat);
        b.rotation.x = -Math.PI / 2;
        b.position.set(0, 0.05, -0.2);
        gunGroup.add(b);

        // Adjust Orient
        gunGroup.rotation.x = -Math.PI / 2;

        // Left Arm
        this.lArm = new THREE.Group(); this.lArm.position.set(-0.3, 1.35, 0); this.mesh.add(this.lArm);
        const lArmMesh = new THREE.Mesh(armGeo, shirtMat); lArmMesh.position.y = -0.15; this.lArm.add(lArmMesh);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.7, 8);
        this.lLeg = new THREE.Mesh(legGeo, pantsMat); this.lLeg.position.set(-0.15, 0.35, 0); this.mesh.add(this.lLeg);
        this.rLeg = new THREE.Mesh(legGeo, pantsMat); this.rLeg.position.set(0.15, 0.35, 0); this.mesh.add(this.rLeg);

        // Health Bar
        this.healthBar = this.createHealthBar();
        this.healthBar.position.set(0, 2.2, 0);
        this.mesh.add(this.healthBar);

        // Physics Body
        const shape = new CANNON.Box(new CANNON.Vec3(0.3, 0.85, 0.3));
        this.body = new CANNON.Body({
            mass: 80,
            shape: shape,
            linearDamping: 0.1,
            fixedRotation: true
        });
        this.body.position.set(x, y + 0.85, z);
        this.game.physicsWorld.addBody(this.body);

        // AI State
        this.state = 'PATROL';
        this.pickRandomPatrolPoint();

        // Spawn Chatter
        if (this.isBoss) {
            this.game.dialogueSystem.triggerEvent('BOSS_SPAWN', this);
        }
    }

    createHealthBar() {
        const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.1), new THREE.MeshBasicMaterial({ color: 0x333333 }));
        const fg = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.08), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
        fg.position.z = 0.01;
        fg.userData.isHealthBar = true;
        bg.add(fg);
        return bg;
    }

    // --- LOGIC ---

    update(dt) {
        if (this.isDead) return;

        // Random IDLE Chatter
        if (Math.random() < 0.002) {
            this.game.dialogueSystem.triggerEvent('IDLE', this);
        }

        // Sync Visuals
        this.mesh.position.copy(this.body.position);
        this.mesh.position.y -= 1.0;

        // Simple AI
        const playerPos = this.game.player.body.position;
        const myPos = this.mesh.position;
        const dist = myPos.distanceTo(playerPos);

        // Decay Recoil
        if (this.recoil > 0) {
            this.recoil -= dt * 5; // Decay speed
            if (this.recoil < 0) this.recoil = 0;
        }

        // Line of Sight Check (Crucial for fairness)
        const canSee = this.checkLineOfSight(playerPos);

        if (dist < 40 && canSee) {
            // CHASE / ATTACK
            this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z); // Look horizontally

            if (dist > 15) {
                // Chase
                this.moveTowards(playerPos);
            } else {
                // Shoot (Stop getting closer, but keep aiming)
                this.stopMovement();
                this.playAnim('aim');
                const now = Date.now();
                if (now - this.lastAttack > 1500) {
                    this.lastAttack = now;
                    this.shoot();
                }
            }
        } else {
            // PATROL
            if (!this.patrolTarget || myPos.distanceTo(this.patrolTarget) < 3) {
                this.pickRandomPatrolPoint();
            }
            this.moveTowards(this.patrolTarget);

            // Randomly pause patrol? No, keep moving for now to show life
        }

        // Physics Wakeup
        this.body.wakeUp();

        this.healthBar.lookAt(this.game.camera.position);
    }

    checkLineOfSight(playerPos) {
        if (!playerPos) return false;
        const start = this.mesh.position.clone(); start.y += 1.5;
        const end = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z); end.y += 1.5;
        const dir = new THREE.Vector3().subVectors(end, start).normalize();
        const dist = start.distanceTo(end);
        const ray = new THREE.Raycaster(start, dir, 0, dist);
        const hits = ray.intersectObjects(this.game.scene.children, true);

        for (let hit of hits) {
            if (hit.object === this.mesh || this.mesh.getObjectById(hit.object.id)) continue;
            if (hit.object.userData.entity && hit.object.userData.entity instanceof Enemy) continue;
            if (hit.object === this.game.player.mesh) return true;
            if (hit.object.geometry) return false; // Wall
        }
        return true;
    }

    moveTowards(target) {
        const dir = new THREE.Vector3(target.x - this.body.position.x, 0, target.z - this.body.position.z).normalize();
        this.body.velocity.x = dir.x * this.speed;
        this.body.velocity.z = dir.z * this.speed;
        this.playAnim('walk');
    }

    stopMovement() {
        this.body.velocity.x = 0;
        this.body.velocity.z = 0;
    }

    pickRandomPatrolPoint() {
        const range = 20;
        this.patrolTarget = new CANNON.Vec3(
            this.body.position.x + (Math.random() - 0.5) * range,
            this.body.position.y,
            this.body.position.z + (Math.random() - 0.5) * range
        );
    }

    playAnim(state) {
        const time = Date.now() * 0.01;

        // Apply recoil offset
        const recoilOffset = this.recoil; // e.g., 0 to 0.5

        if (state === 'walk') {
            this.lLeg.rotation.x = Math.sin(time * 15) * 0.8;
            this.rLeg.rotation.x = Math.sin(time * 15 + Math.PI) * 0.8;
            this.lArm.rotation.x = Math.sin(time * 15 + Math.PI) * 0.8;
            this.rArm.rotation.x = -1.4 + Math.sin(time * 15) * 0.1 - recoilOffset;
        } else {
            // Aim/Idle
            this.lLeg.rotation.x = 0; this.rLeg.rotation.x = 0;
            this.rArm.rotation.x = -1.5 - recoilOffset; // Kick UP (Negative X is Up/Back)
        }
    }

    shoot() {
        if (this.isDead) return;

        // Combat Chatter
        if (Math.random() < 0.2) {
            this.game.dialogueSystem.triggerEvent('COMBAT', this);
        }

        // Trigger Visual Recoil
        this.recoil = 0.5; // Kick value

        // Visuals
        const gunPos = this.mesh.position.clone().add(new THREE.Vector3(0, 1.3, 0));
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
        gunPos.add(forward.multiplyScalar(0.5));
        this.game.spawnParticles(gunPos, 0xFFFF00, 10);

        // Logic
        if (this.game.player) {
            const playerPos = this.game.player.body.position;
            // Simple hit chance check if line of sight
            if (this.checkLineOfSight(playerPos)) {
                if (Math.random() > 0.3) {
                    this.game.player.takeDamage(10);
                }
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;

        // Simple Color Flash (No Physics Knockback)
        this.mesh.traverse(c => {
            if (c.isMesh && c.material && c.material.emissive) {
                const old = c.material.emissive.getHex();
                c.material.emissive.setHex(0xff0000);
                setTimeout(() => { if (c && c.material) c.material.emissive.setHex(old); }, 100);
            }
        });

        // Update Bar
        if (this.healthBar) {
            const fg = this.healthBar.children.find(c => c.userData.isHealthBar);
            if (fg) fg.scale.x = Math.max(0, this.health / this.maxHealth);
        }

        if (this.health <= 0) this.die();
    }

    die() {
        this.isDead = true;
        this.game.dialogueSystem.triggerEvent('DEATH', this); // Shout on death
        this.game.scene.remove(this.mesh);
        this.game.physicsWorld.removeBody(this.body);
        const index = this.game.enemies.indexOf(this);
        if (index > -1) this.game.enemies.splice(index, 1);
        if (this.game.player) this.game.player.addKill();
    }
}
