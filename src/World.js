import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class World {
    constructor(game) {
        this.game = game;
        this.createFloor();
        this.generateTown();
    }

    createFloor() {
        // Desert Ground
        const geometry = new THREE.PlaneGeometry(2000, 2000, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xE6C288,
            roughness: 1.0,
            metalness: 0.0,
            side: THREE.FrontSide
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = -0.1;
        mesh.receiveShadow = true;
        this.game.scene.add(mesh);

        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.game.physicsWorld.addBody(groundBody);
    }

    generateTown() {
        const cellSize = 15;
        const rows = 16;
        const cols = 16;

        // Map: 1 = Building, 2 = Start, 3 = End, 0 = Road
        const map = [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1],
            [1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1],
            [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ];

        this.spawnPoints = [];
        this.maze = map;
        this.tumbleweeds = [];

        // Spawn some initial tumbleweeds
        for (let i = 0; i < 15; i++) {
            this.tumbleweeds.push(new Tumbleweed(this.game, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200));
        }

        for (let z = 0; z < rows; z++) {
            for (let x = 0; x < cols; x++) {
                const type = map[z][x];
                const worldX = (x - cols / 2) * cellSize;
                const worldZ = (z - rows / 2) * cellSize;

                if (type === 1) {
                    if (x === 0 || x === cols - 1 || z === 0 || z === rows - 1) {
                        this.createCanyonRock(worldX, worldZ, cellSize);
                    } else {
                        this.createBuilding(worldX, worldZ, cellSize);
                    }
                } else if (type === 2) {
                    this.game.startPos = new CANNON.Vec3(worldX, 2, worldZ);
                } else if (type === 3) {
                    this.createGoal(worldX, worldZ);
                    this.spawnPoints.push({ x: worldX - 5, z: worldZ });
                    this.spawnPoints.push({ x: worldX + 5, z: worldZ });
                } else {
                    // Street props & Details
                    // Restore original static props chance
                    if (Math.random() < 0.4) this.createCactus(worldX, 0, worldZ);
                    if (Math.random() < 0.05) this.createBarrel(worldX, worldZ); // RESTORED
                    if (Math.random() < 0.3) this.createGrass(worldX, worldZ);

                    if (x > 4 || z > 4) {
                        this.spawnPoints.push({ x: worldX, z: worldZ });
                    }
                }
            }
        }
    }

    createBuilding(x, z, size) {
        const height = Math.random() > 0.5 ? 8 : 5;
        const w = size * 0.9;
        const d = size * 0.9;

        const geo = new THREE.BoxGeometry(w, height, d);
        const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, height / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.game.scene.add(mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(w / 2, height / 2, d / 2));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.set(x, height / 2, z);
        this.game.physicsWorld.addBody(body);

        const roofGeo = new THREE.ConeGeometry(w * 0.8, 3, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x5C4033 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(x, height + 1.5, z);
        roof.rotation.y = Math.PI / 4;
        this.game.scene.add(roof);
    }

    createCanyonRock(x, z, size) {
        const height = 40 + Math.random() * 10;
        const w = size;
        const d = size;
        const geo = new THREE.DodecahedronGeometry(size * 0.8, 0);
        const mat = new THREE.MeshStandardMaterial({ color: 0xA0522D, flatShading: true });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.scale.set(1, height / size, 1);
        mesh.position.set(x, height / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.game.scene.add(mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(w / 2, 50, d / 2));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.set(x, 50, z);
        this.game.physicsWorld.addBody(body);
    }

    createGoal(x, z) {
        const geo = new THREE.IcosahedronGeometry(1.5, 0);
        const mat = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFAA00, emissiveIntensity: 0.5 });
        this.goalMesh = new THREE.Mesh(geo, mat);
        this.goalMesh.position.set(x, 3, z);
        this.game.scene.add(this.goalMesh);

        const light = new THREE.PointLight(0xFFD700, 3, 20);
        light.position.set(x, 5, z);
        this.game.scene.add(light);
    }

    createCactus(x, y, z) {
        const h = 2 + Math.random() * 2;
        const r = 0.25;
        const mat = new THREE.MeshStandardMaterial({ color: 0x2D5016 });
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), mat);
        mesh.position.set(x, y + h / 2, z);
        mesh.castShadow = true;
        this.game.scene.add(mesh);

        const shape = new CANNON.Cylinder(r, r, h, 8);
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape, new CANNON.Vec3(0, 0, 0), new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0));
        body.position.set(x, y + h / 2, z);
        this.game.physicsWorld.addBody(body);
    }

    createBarrel(x, z) {
        const r = 0.4;
        const h = 0.8;
        const geo = new THREE.CylinderGeometry(r, r, h, 12);
        const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true;
        this.game.scene.add(mesh);

        const shape = new CANNON.Cylinder(r, r, h, 12);
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape, new CANNON.Vec3(0, 0, 0), new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0));
        body.position.set(x, h / 2, z);
        this.game.physicsWorld.addBody(body);
    }

    createGrass(x, z) {
        const material = new THREE.MeshStandardMaterial({
            color: 0x556B2F,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });

        const geo = new THREE.PlaneGeometry(0.8, 0.8);
        const group = new THREE.Group();

        const p1 = new THREE.Mesh(geo, material);
        p1.position.y = 0.4;
        p1.userData.ignoreRaycast = true;
        group.add(p1);

        const p2 = new THREE.Mesh(geo, material);
        p2.position.y = 0.4;
        p2.userData.ignoreRaycast = true;
        p2.rotation.y = Math.PI / 2;
        group.add(p2);

        group.position.set(
            x + (Math.random() - 0.5) * 10,
            0,
            z + (Math.random() - 0.5) * 10
        );

        this.game.scene.add(group);
    }

    update(dt) {
        if (this.goalMesh) {
            this.goalMesh.rotation.y += dt;
            if (this.game.player) {
                const dist = this.game.player.body.position.distanceTo(
                    new CANNON.Vec3(this.goalMesh.position.x, this.goalMesh.position.y, this.goalMesh.position.z)
                );
                if (dist < 3.5) this.game.winGame();
            }
        }

        // Tumbleweeds
        if (this.tumbleweeds) {
            this.tumbleweeds.forEach(t => t.update(dt));
        }
    }
}

class Tumbleweed {
    constructor(game, x, z) {
        this.game = game;
        this.mesh = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.4, 0),
            new THREE.MeshBasicMaterial({ color: 0x5c4033, wireframe: true })
        );
        this.mesh.position.set(x, 0.4, z);
        this.game.scene.add(this.mesh);

        // Movement
        const angle = Math.random() * Math.PI * 2;
        this.dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        this.speed = 2 + Math.random() * 3;
    }

    update(dt) {
        // Roll
        this.mesh.position.addScaledVector(this.dir, this.speed * dt);

        // Rotate (Visual roll)
        const axis = new THREE.Vector3(this.dir.z, 0, -this.dir.x); // Perpendicular
        this.mesh.rotateOnWorldAxis(axis, -(this.speed / 0.4) * dt);

        // Loop around world (100x100 approx)
        if (this.mesh.position.x > 120) this.mesh.position.x = -120;
        if (this.mesh.position.x < -120) this.mesh.position.x = 120;
        if (this.mesh.position.z > 120) this.mesh.position.z = -120;
        if (this.mesh.position.z < -120) this.mesh.position.z = 120;
    }
}
