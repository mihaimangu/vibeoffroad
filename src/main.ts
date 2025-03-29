// Entry point for the VibeOffroad game

import * as THREE from 'three';
import { setupScene } from './core/sceneSetup';
import { createTerrain } from './entities/Terrain';
import { createCar } from './entities/Car';
import { createFences } from './entities/Fence';
import { setupOrbitControls } from './controls/OrbitControlsSetup';

// Initialize core components
const { scene, camera, renderer } = setupScene();

// Create entities
const terrain = createTerrain();
scene.add(terrain);

const car = createCar();
scene.add(car);

// Get terrain dimensions (assuming createTerrain defines these implicitly or explicitly)
// We'll use the values we set in Terrain.ts for now
const terrainWidth = 200;
const terrainHeight = 200;

// Create fences
const fences = createFences(terrainWidth, terrainHeight);
scene.add(fences);

// Setup controls
const controls = setupOrbitControls(camera, renderer.domElement);

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Update Controls
    controls.update(); // Required for damping

    // Update physics simulation (TODO)
    // world.step(1/60);

    // Update game entities (e.g., sync car mesh with physics body)
    // car.position.copy(physicsBody.position);
    // car.quaternion.copy(physicsBody.quaternion);

    // Render the scene
    renderer.render(scene, camera);
}

// Start the animation loop
animate();

console.log("VibeOffroad game initialized with modular structure."); 