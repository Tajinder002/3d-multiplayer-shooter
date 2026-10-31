import * as THREE from 'three';

export class Player {
  constructor(id, name, color, game) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.game = game;
    this.health = 100;
    this.ammo = 30;
    this.maxAmmo = 120;
    this.lastShot = 0;
    this.isDead = false;
    this.score = 0;
    this.kills = 0;
    
    // Create player mesh
    const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.5);
    const material = new THREE.MeshLambertMaterial({ color: color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 1.5, 0);
    
    // Add player to scene
    this.game.scene.add(this.mesh);
    
    // Create weapon mesh (pistol)
    const weaponGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.4);
    const weaponMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    this.weapon.position.set(0.3, -0.2, -0.5);
    this.game.scene.add(this.weapon);
    
    // Setup shooting cooldown
    this.shootCooldown = 0;
  }

  move(delta) {
    // Handle player movement with WASD
    const moveSpeed = 5;
    let moveVector = new THREE.Vector3();
    
    if (this.game.keys['w']) moveVector.z -= 1;
    if (this.game.keys['s']) moveVector.z += 1;
    if (this.game.keys['a']) moveVector.x -= 1;
    if (this.game.keys['d']) moveVector.x += 1;
    
    if (moveVector.length() > 0) {
      moveVector.normalize().multiplyScalar(moveSpeed * delta);
      
      // Apply movement with physics
      const newPosition = new THREE.Vector3(
        this.mesh.position.x + moveVector.x,
        this.mesh.position.y,
        this.mesh.position.z + moveVector.z
      );
      
      this.mesh.position.copy(newPosition);
      this.weapon.position.copy(new THREE.Vector3(
        0.3, -0.2, -0.5
      ).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.game.camera.rotation.y));
    }
    
    // Update rotation based on mouse look
    this.mesh.rotation.y = this.game.camera.rotation.y;
  }

  shoot() {
    if (this.game.clock) {
      const currentTime = this.game.clock.getElapsedTime();
      
      // Check if we can shoot (ammo and cooldown)
      if (this.ammo > 0 && currentTime - this.lastShot > 0.3) {
        this.lastShot = currentTime;
        this.ammo--;
        
        // Create bullet
        this.createBullet();
        
        // Play shooting sound
        this.game.audioManager?.playSound('shoot');
        
        return true;
      }
    }
    return false;
  }

  createBullet() {
    const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Bullet position and direction
    bullet.position.set(
      this.mesh.position.x + Math.sin(this.game.camera.rotation.y) * 0.5,
      this.mesh.position.y + 0.1,
      this.mesh.position.z + Math.cos(this.game.camera.rotation.y) * 0.5
    );
    
    const direction = new THREE.Vector3(
      Math.sin(this.game.camera.rotation.y),
      0,
      Math.cos(this.game.camera.rotation.y)
    );
    
    // Add bullet to scene
    this.game.scene.add(bullet);
    
    // Animate bullet
    const velocity = direction.multiplyScalar(20);
    const animateBullet = () => {
      bullet.position.add(velocity.multiplyScalar(0.016));
      
      // Check collision with players
      this.checkBulletCollision(bullet);
      
      // Remove bullet if off screen
      if (bullet.position.length() > 100) {
        this.game.scene.remove(bullet);
        clearInterval(bullet.intervalId);
      }
    };
    
    bullet.intervalId = setInterval(animateBullet, 16);
  }

  checkBulletCollision(bullet) {
    // Check collision with other players
    this.game.world.players.forEach(player => {
      if (player.id !== this.id && !player.isDead) {
        const distance = bullet.position.distanceTo(player.mesh.position);
        
        if (distance < 0.5) {
          // Hit player
          player.takeDamage(25);
          
          // Visual feedback
          const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          const flash = new THREE.Mesh(new THREE.SphereGeometry(0.3), flashMaterial);
          flash.position.copy(player.mesh.position);
          this.game.scene.add(flash);
          
          setTimeout(() => {
            this.game.scene.remove(flash);
          }, 200);
          
          // Remove bullet
          this.game.scene.remove(bullet);
          clearInterval(bullet.intervalId);
        }
      }
    });
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    
    if (this.health <= 0) {
      this.isDead = true;
      this.game.multiplayer.handlePlayerDeath(this.id);
    }
    
    // Visual feedback for damage
    if (this.mesh) {
      this.mesh.material.emissive = new THREE.Color(0xff0000);
      setTimeout(() => {
        if (this.mesh) {
          this.mesh.material.emissive = new THREE.Color(0x000000);
        }
      }, 200);
    }
  }

  respawn() {
    this.isDead = false;
    this.health = 100;
    this.ammo = this.maxAmmo;
    this.mesh.position.set(0, 1.5, 0);
  }

  reload() {
    if (this.ammo < this.maxAmmo) {
      this.ammo = this.maxAmmo;
      this.game.audioManager?.playSound('reload');
    }
  }

  addKill() {
    this.kills++;
    this.score += 100;
    this.game.audioManager?.playSound('kill');
  }

  getState() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      position: {
        x: this.mesh.position.x,
        y: this.mesh.position.y,
        z: this.mesh.position.z
      },
      rotation: this.game.camera.rotation.y,
      health: this.health,
      ammo: this.ammo,
      maxAmmo: this.maxAmmo,
      isDead: this.isDead,
      score: this.score,
      kills: this.kills
    };
  }

  update(delta) {
    // Update player
    this.move(delta);
    
    // Update weapon position
    if (this.weapon) {
      const offset = new THREE.Vector3(0.3, -0.2, -0.5);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.game.camera.rotation.y);
      this.weapon.position.copy(offset);
      this.weapon.rotation.copy(this.game.camera.rotation);
    }
  }

  destroy() {
    this.game.scene.remove(this.mesh);
    if (this.weapon) {
      this.game.scene.remove(this.weapon);
    }
  }
}