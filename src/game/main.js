import * as THREE from 'three';
import { World } from './world.js';
import { Multiplayer } from './multiplayer.js';

class Game {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.world = null;
    this.multiplayer = null;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.keys = {};
    this.isRunning = false;
  }

  init() {
    // Initialize Three.js
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    
    // Create game container
    const gameContainer = document.getElementById('game-container');
    gameContainer.appendChild(this.renderer.domElement);
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);
    this.scene.fog = new THREE.FogExp2(0x1a1a1a, 0.02);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.5, 0);
    
    // Initialize game systems
    this.world = new World(this.scene);
    this.multiplayer = new Multiplayer(this);
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Start loading
    this.world.loadLevel();
    
    // Show game after loading
    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('hidden');
      document.getElementById('menu-screen').classList.remove('hidden');
    }, 2000);
    
    // Start game loop
    this.isRunning = true;
    this.animate();
  }

  setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Keyboard input
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      
      if (e.key === 'r') {
        this.multiplayer.sendInput('reload');
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
    
    // Mouse input
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        this.multiplayer.sendInput('shoot');
      }
    });
    
    window.addEventListener('mousemove', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });
  }

  animate() {
    if (!this.isRunning) return;
    
    requestAnimationFrame(() => this.animate());
    
    const deltaTime = this.clock.getDelta();
    
    // Update game systems
    this.world.update(deltaTime);
    this.multiplayer.update(deltaTime);
    
    // Handle player movement
    if (this.multiplayer.localPlayer) {
      const moveSpeed = 5;
      const moveVector = new THREE.Vector3(0, 0, 0);
      
      if (this.keys['w']) moveVector.z -= 1;
      if (this.keys['s']) moveVector.z += 1;
      if (this.keys['a']) moveVector.x -= 1;
      if (this.keys['d']) moveVector.x += 1;
      
      if (moveVector.length() > 0) {
        moveVector.normalize().multiplyScalar(moveSpeed * deltaTime);
        this.multiplayer.localPlayer.move(moveVector);
      }
    }
    
    // Render
    this.renderer.render(this.scene, this.camera);
  }

  startGame(playerName) {
    this.multiplayer.connect(playerName);
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('crosshair').classList.remove('hidden');
  }

  handlePlayerDeath() {
    document.getElementById('death-screen').classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('respawn-btn').focus();
    }, 100);
  }

  handlePlayerRespawn() {
    document.getElementById('death-screen').classList.add('hidden');
    this.multiplayer.sendInput('respawn');
  }

  updateUI(data) {
    // Update health bar
    const healthFill = document.getElementById('health-fill');
    const healthText = document.getElementById('health-text');
    healthFill.style.width = `${data.health}%`;
    healthText.textContent = data.health;
    
    // Update ammo counter
    const ammoCounter = document.getElementById('ammo-counter');
    ammoCounter.textContent = `${data.ammo}/120`;
    
    // Update minimap (simplified)
    const minimap = document.getElementById('minimap');
    if (data.playerPositions) {
      minimap.innerHTML = '';
      data.playerPositions.forEach(player => {
        const dot = document.createElement('div');
        dot.className = 'minimap-player';
        dot.style.left = `${(player.position.x + 10) / 20 * 100}%`;
        dot.style.top = `${(player.position.z + 10) / 20 * 100}%`;
        dot.style.backgroundColor = player.color;
        minimap.appendChild(dot);
      });
    }
  }

  cleanup() {
    this.isRunning = false;
    this.renderer.dispose();
    this.world.cleanup();
    this.multiplayer.disconnect();
  }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.init();
  
  // Handle menu join button
  document.getElementById('join-game-btn')?.addEventListener('click', () => {
    const playerName = document.getElementById('player-name').value || 'Player';
    game.startGame(playerName);
  });
  
  // Handle respawn button
  document.getElementById('respawn-btn')?.addEventListener('click', () => {
    game.handlePlayerRespawn();
  });
  
  // Save game instance for debugging
  window.game = game;
});