import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class Physics {
  constructor() {
    this.world = new CANNON.World();
    this.bodies = [];
    
    // Configure physics world
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    
    // Create ground plane
    const groundMaterial = new CANNON.Material('ground');
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.material = groundMaterial;
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(groundBody);
  }

  createPlayer(playerId, position, color) {
    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
    const body = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      shape: shape,
      material: new CANNON.Material(`${playerId}-material`)
    });
    
    const visual = this.createVisualMesh(shape, color);
    this.bodies.push({ id: playerId, body, visual });
    this.world.addBody(body);
    
    return { body, visual };
  }

  createProjectile(playerId, position, direction, color) {
    const shape = new CANNON.Sphere(0.2);
    const body = new CANNON.Body({
      mass: 0.1,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      velocity: new CANNON.Vec3(direction.x, direction.y, direction.z).scale(20),
      shape: shape,
      material: new CANNON.Material(`${playerId}-projectile`)
    });
    
    const visual = this.createVisualMesh(shape, color);
    this.bodies.push({ id: body.id, body, visual });
    this.world.addBody(body);
    
    return { body, visual };
  }

  createVisualMesh(shape, color) {
    let geometry;
    
    if (shape instanceof CANNON.Box) {
      const halfExtents = shape.halfExtents;
      geometry = new THREE.BoxGeometry(
        halfExtents.x * 2,
        halfExtents.y * 2,
        halfExtents.z * 2
      );
    } else if (shape instanceof CANNON.Sphere) {
      geometry = new THREE.SphereGeometry(shape.radius, 16, 16);
    } else {
      geometry = new THREE.BoxGeometry(1, 1, 1);
    }
    
    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    
    return mesh;
  }

  update(deltaTime) {
    this.world.step(deltaTime);
  }

  cleanup() {
    this.bodies.forEach(({ body, visual }) => {
      this.world.removeBody(body);
    });
    this.bodies = [];
  }
}