const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 16;

// Game state management
const gameState = {
  players: {},
  projectiles: [],
  startTime: Date.now()
};

// Server configuration
app.use(express.static(path.join(__dirname, '../dist')));

io.on('connection', (socket) => {
  console.log('New player connected:', socket.id);
  
  // Check if server is full
  if (Object.keys(gameState.players).length >= MAX_PLAYERS) {
    socket.emit('game-full');
    return;
  }
  
  const playerId = socket.id;
  const color = generateRandomColor();
  const position = getRandomSpawnPosition();
  
  // Add new player to game state
  gameState.players[playerId] = {
    id: playerId,
    name: socket.handshake.query.name || `Player-${Math.floor(Math.random() * 10000)}`,
    color: color,
    position: position,
    rotation: 0,
    health: 100,
    ammo: 30,
    maxAmmo: 120,
    lastShot: 0,
    isDead: false,
    score: 0,
    kills: 0
  };
  
  // Broadcast new player to all clients
  socket.broadcast.emit('player-joined', gameState.players[playerId]);
  
  // Send current game state to the new player
  socket.emit('game-state', {
    players: gameState.players,
    projectiles: gameState.projectiles,
    time: Date.now() - gameState.startTime
  });
  
  // Broadcast current game state to all players
  io.emit('game-state-update', {
    players: gameState.players,
    projectiles: gameState.projectiles
  });
  
  // Handle player movement
  socket.on('player-move', (data) => {
    if (gameState.players[playerId]) {
      const oldPosition = gameState.players[playerId].position;
      gameState.players[playerId].position = data.position;
      gameState.players[playerId].rotation = data.rotation;
      
      // Broadcast movement to other players
      socket.broadcast.emit('player-move', {
        playerId: playerId,
        position: data.position,
        rotation: data.rotation
      });
    }
  });
  
  // Handle shooting
  socket.on('player-shoot', (data) => {
    if (gameState.players[playerId] && !gameState.players[playerId].isDead) {
      const player = gameState.players[playerId];
      
      // Check ammo
      if (player.ammo <= 0 && Date.now() - player.lastShot > 3000) {
        // Reload
        player.ammo = player.maxAmmo;
        socket.emit('reload');
      }
      
      if (player.ammo > 0) {
        // Create projectile
        const projectile = {
          id: Date.now().toString(),
          playerId: playerId,
          position: data.position,
          direction: data.direction,
          color: player.color
        };
        
        gameState.projectiles.push(projectile);
        
        // Update player stats
        player.ammo--;
        player.lastShot = Date.now();
        
        // Broadcast projectile to all clients
        io.emit('projectile-fired', projectile);
      }
    }
  });
  
  // Handle player damage
  socket.on('player-damage', (data) => {
    if (gameState.players[playerId]) {
      gameState.players[playerId].health = Math.max(0, gameState.players[playerId].health - data.damage);
      
      if (gameState.players[playerId].health <= 0) {
        gameState.players[playerId].isDead = true;
        gameState.players[playerId].score += data.killerScore || 0;
        gameState.players[playerId].kills += data.kills || 0;
        
        // Broadcast death to all clients
        socket.broadcast.emit('player-died', {
          playerId: playerId,
          killerId: data.killerId
        });
      }
      
      // Broadcast health update to other players
      socket.broadcast.emit('player-damaged', {
        playerId: playerId,
        health: gameState.players[playerId].health,
        isDead: gameState.players[playerId].isDead
      });
    }
  });
  
  // Handle player respawn
  socket.on('player-respawn', () => {
    if (gameState.players[playerId]) {
      gameState.players[playerId].isDead = false;
      gameState.players[playerId].health = 100;
      
      // Broadcast respawn to all clients
      io.emit('player-respawned', {
        playerId: playerId
      });
    }
  });
  
  // Handle player disconnect
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    if (gameState.players[playerId]) {
      // Remove player from game state
      const deadPlayer = { ...gameState.players[playerId] };
      delete gameState.players[playerId];
      
      // Broadcast player left to all clients
      socket.broadcast.emit('player-left', playerId);
    }
  });
});

// Start game loop
const gameLoop = () => {
  const now = Date.now();
  const deltaTime = now - (gameState.lastUpdate || now);
  gameState.lastUpdate = now;
  
  // Update projectiles
  for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
    const projectile = gameState.projectiles[i];
    
    // Move projectile
    projectile.position.x += projectile.direction.x * 15;
    projectile.position.y += projectile.direction.y * 15;
    projectile.position.z += projectile.direction.z * 15;
    
    // Check collision with players (simple boundary check)
    let hitPlayer = null;
    for (const [playerId, player] of Object.entries(gameState.players)) {
      if (player.isDead) continue;
      
      const distance = Math.sqrt(
        Math.pow(projectile.position.x - player.position.x, 2) +
        Math.pow(projectile.position.y - player.position.y, 2) +
        Math.pow(projectile.position.z - player.position.z, 2)
      );
      
      if (distance < 0.5) {
        hitPlayer = playerId;
        break;
      }
    }
    
    if (hitPlayer) {
      // Handle projectile hit
      io.emit('hit-player', {
        playerId: hitPlayer,
        projectileId: projectile.id,
        damage: 25,
        killerId: projectile.playerId
      });
      
      // Remove projectile
      gameState.projectiles.splice(i, 1);
    } else {
      // Remove projectile if off-screen
      if (projectile.position.x > 100 || projectile.position.x < -100 ||
          projectile.position.y > 100 || projectile.position.y < -100 ||
          projectile.position.z > 100 || projectile.position.z < -100) {
        gameState.projectiles.splice(i, 1);
      }
    }
  }
  
  // Broadcast game state update
  io.emit('game-state-update', {
    players: gameState.players,
    projectiles: gameState.projectiles
  });
};

setInterval(gameLoop, 1000 / 60); // 60 FPS

// Utility functions
function generateRandomColor() {
  const colors = ['#ff0055', '#00ff88', '#ffaa00', '#0088ff', '#ff00ff', '#ffff00'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomSpawnPosition() {
  const x = (Math.random() - 0.5) * 20;
  const z = (Math.random() - 0.5) * 20;
  return { x, y: 1.5, z };
}

server.listen(PORT, () => {
  console.log(`3D Multiplayer Shooter server running on port ${PORT}`);
  console.log(`Max players: ${MAX_PLAYERS}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
  });
});