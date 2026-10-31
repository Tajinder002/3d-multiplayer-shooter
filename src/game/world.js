import * as THREE from 'three';
import { Physics } from './physics.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.physics = new Physics();
    this.meshes = [];
    this.models = [];
  }

  loadLevel() {
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x808080,
      transparent: true,
      opacity: 0.3
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Create ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    // Create directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
    
    // Create walls
    this.createWalls();
    
    // Create some basic objects
    this.createEnvironmentObjects();
    
    // Add lighting effects
    this.createLightingEffects();
  }

  createWalls() {
    const wallGeometry = new THREE.BoxGeometry(2, 5, 0.5);
    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x404040 });
    
    // Create four walls
    const walls = [
      { position: { x: 0, y: 2.5, z: -50 }, rotation: { x: 0, y: 0, z: 0 } },
      { position: { x: 50, y: 2.5, z: 0 }, rotation: { x: 0, y: -Math.PI / 2, z: 0 } },
      { position: { x: 0, y: 2.5, z: 50 }, rotation: { x: 0, y: Math.PI, z: 0 } },
      { position: { x: -50, y: 2.5, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 } }
    ];
    
    walls.forEach(wall => {
      const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
      wallMesh.position.set(wall.position.x, wall.position.y, wall.position.z);
      wallMesh.rotation.set(wall.rotation.x, wall.rotation.y, wall.rotation.z);
      this.scene.add(wallMesh);
    });
  }

  createEnvironmentObjects() {
    // Create some boxes/crates
    for (let i = 0; i < 10; i++) {
      const boxGeometry = new THREE.BoxGeometry(
        Math.random() * 2 + 1,
        Math.random() * 2 + 1,
        Math.random() * 2 + 1
      );
      const boxMaterial = new THREE.MeshPhongMaterial({ 
        color: Math.random() * 0xffffff
      });
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      
      box.position.set(
        (Math.random() - 0.5) * 40,
        Math.random() * 3 + 0.5,
        (Math.random() - 0.5) * 40
      );
      box.castShadow = true;
      box.receiveShadow = true;
      this.scene.add(box);
      this.meshes.push(box);
    }
  }

  createLightingEffects() {
    // Add point lights for atmosphere
    for (let i = 0; i < 5; i++) {
      const pointLight = new THREE.PointLight(
        Math.random() * 0xffffff,
        0.5,
        20
      );
      pointLight.position.set(
        (Math.random() - 0.5) * 30,
        Math.random() * 10,
        (Math.random() - 0.5) * 30
      );
      this.scene.add(pointLight);
      this.models.push(pointLight);
    }
  }

  update(deltaTime) {
    this.physics.update(deltaTime);
    
    // Update visual meshes to match physics bodies
    this.physics.bodies.forEach(({ body, visual }) => {
      visual.position.copy(body.position);
      visual.quaternion.copy(body.quaternion);
    });
  }

  cleanup() {
    this.meshes.forEach(mesh => {
      this.scene.remove(mesh);
    });
    
    this.models.forEach(model => {
      this.scene.remove(model);
    });
    
    this.physics.cleanup();
  }
}