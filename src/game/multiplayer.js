import * as THREE from 'three';

export class Multiplayer {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.localPlayer = null;
    this.projectiles = [];
  }

  connect(playerName) {
    // Allow overriding the game server via ?server= URL param,
    // otherwise fall back to same-origin (works locally with `npm run dev`).
    const urlParams = new URLSearchParams(window.location.search);
    const serverUrl = urlParams.get('server') || undefined;

    this.socket = io(serverUrl);

    // Set player name from URL params
    const nameFromUrl = urlParams.get('name');

    this.socket.emit('join-game', {
      name: playerName || nameFromUrl || 'Player'
    });
    
    // Handle connection events
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.game.renderer.domElement.focus();
    });
    
    this.socket.on('game-state', (data) => {
      this.updateGameState(data);
    });
    
    this.socket.on('game-state-update', (data) => {
      this.updateGameState(data);
    });
    
    this.socket.on('player-joined', (playerData) => {
      this.createRemotePlayer(playerData);
    });
    
    this.socket.on('player-left', (playerId) => {
      this.removeRemotePlayer(playerId);
    });
    
    this.socket.on('player-move', (data) => {
      const player = this.getRemotePlayer(data.playerId);
      if (player) {
        player.position.copy(data.position);
        player.rotation = data.rotation;
      }
    });
    
    this.socket.on('player-shoot', (data) => {
      this.createRemoteProjectile(data);
    });
    
    this.socket.on('player-damaged', (data) => {
      const player = this.getRemotePlayer(data.playerId);
      if (player) {
        player.health = data.health;
        player.isDead = data.isDead;
      }
    });
    
    this.socket.on('player-died', (data) => {
      const player = this.getRemotePlayer(data.playerId);
      if (player) {
        player.isDead = true;
      }
      
      if (data.killerId === this.localPlayer.id) {
        this.game.multiplayer.addKill();
      }
    });
    
    this.socket.on('hit-player', (data) => {
      this.hitPlayer(data);
    });
    
    this.socket.on('player-respawned', (data) => {
      const player = this.getRemotePlayer(data.playerId);
      if (player) {
        player.isDead = false;
        player.health = 100;
      }
    });
    
    this.socket.on('game-over', () => {
      this.game.handlePlayerDeath();
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  createRemotePlayer(playerData) {
    const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
    const material = new THREE.MeshLambertMaterial({ color: playerData.color });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(playerData.position.x, playerData.position.y, playerData.position.z);
    mesh.name = playerData.id;
    
    this.game.scene.add(mesh);
    
    const player = {
      id: playerData.id,
      name: playerData.name,
      color: playerData.color,
      position: mesh.position,
      rotation: playerData.rotation || 0,
      health: playerData.health,
      ammo: playerData.ammo,
      maxAmmo: playerData.maxAmmo || 120,
      lastShot: playerData.lastShot || 0,
      isDead: playerData.isDead || false,
      score: playerData.score || 0,
      kills: playerData.kills || 0,
      mesh: mesh
    };
    
    if (playerData.id === this.socket.id) {
      this.localPlayer = player;
    }
    
    return player;
  }

  getRemotePlayer(playerId) {
    // This would need to be stored in a player map
    // For simplicity, return local player for now
    return this.localPlayer;
  }

  removeRemotePlayer(playerId) {
    const player = this.getRemotePlayer(playerId);
    if (player && player.mesh) {
      this.game.scene.remove(player.mesh);
    }
  }

  createRemoteProjectile(data) {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshLambertMaterial({ color: data.color });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(data.position.x, data.position.y, data.position.z);
    
    const projectile = {
      id: data.id,
      playerId: data.playerId,
      position: mesh.position,
      direction: data.direction,
      color: data.color,
      mesh: mesh,
      lifeTime: 0
    };
    
    this.game.scene.add(mesh);
    this.projectiles.push(projectile);
    
    // Animate projectile
    const animateProjectile = () => {
      const projectile = this.projectiles.find(p => p.mesh && p.mesh.userData.id === data.id);
      if (!projectile) return;
      
      projectile.position.x += projectile.direction.x * 0.1;
      projectile.position.y += projectile.direction.y * 0.1;
      projectile.position.z += projectile.direction.z * 0.1;
      
      projectile.lifeTime += 0.016;
      
      if (projectile.lifeTime > 2.0) {
        this.removeProjectile(projectile);
      }
    };
    
    const intervalId = setInterval(animateProjectile, 16);
    projectile.intervalId = intervalId;
  }

  removeProjectile(projectile) {
    if (projectile.mesh && this.game.scene) {
      this.game.scene.remove(projectile.mesh);
    }
    if (projectile.intervalId) {
      clearInterval(projectile.intervalId);
    }
    const index = this.projectiles.indexOf(projectile);
    if (index > -1) {
      this.projectiles.splice(index, 1);
    }
  }

  hitPlayer(data) {
    const player = this.getRemotePlayer(data.playerId);
    if (player) {
      // Visual feedback for hit
      player.mesh?.material?.emissive?.setHex(0xff0000);
      setTimeout(() => {
        if (player.mesh?.material) {
          player.mesh.material.emissive.setHex(0x000000);
        }
      }, 200);
    }
  }

  update(deltaTime) {
    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      // Update visual position
      // Projectile movement is handled in the remote projectile creation
    }
    
    // Update local player
    if (this.localPlayer && this.socket?.connected) {
      this.sendInput('move', {
        position: this.localPlayer.position,
        rotation: this.localPlayer.rotation
      });
    }
  }

  sendInput(type, data) {
    if (this.socket?.connected) {
      switch (type) {
        case 'move':
          this.socket.emit('player-move', data);
          break;
        case 'shoot':
          this.socket.emit('player-shoot', data);
          break;
        case 'respawn':
          this.socket.emit('player-respawn');
          break;
        case 'reload':
          this.socket.emit('reload');
          break;
      }
    }
  }

  addKill() {
    if (this.localPlayer) {
      this.localPlayer.kills++;
    }
  }

  updateGameState(data) {
    if (data.players) {
      Object.values(data.players).forEach(playerData => {
        // Update remote players
        if (playerData.id !== this.socket?.id) {
          const existingPlayer = this.getRemotePlayer(playerData.id);
          if (existingPlayer) {
            existingPlayer.position.copy(playerData.position);
            existingPlayer.rotation = playerData.rotation;
            existingPlayer.health = playerData.health;
            existingPlayer.ammo = playerData.ammo;
            existingPlayer.isDead = playerData.isDead;
            existingPlayer.score = playerData.score;
            existingPlayer.kills = playerData.kills;
          }
        }
      });
    }
    
    if (data.projectiles) {
      // Update projectiles
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.projectiles.forEach(projectile => {
      this.removeProjectile(projectile);
    });
    this.projectiles = [];
  }
}