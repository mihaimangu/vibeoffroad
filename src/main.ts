// Entry point for the VibeOffroad game

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger'; // Import the debugger

import { setupScene } from './core/sceneSetup';
import { setupPhysicsWorld } from './core/physicsSetup';
import { createTerrain } from './entities/Terrain';
import { createCar } from './entities/Car';
import { createFences } from './entities/Fence';
import { setupOrbitControls } from './controls/OrbitControlsSetup';

// Initialize core components
const { scene, camera, renderer } = setupScene();

// Initialize physics world
const { world, materials } = setupPhysicsWorld();

// Initialize physics debugger
const cannonDebugger = CannonDebugger(scene, world, {
    // options... 
    color: 0x00ff00, // Wireframe color
    scale: 1.0, // Optional: scale the debug meshes
});

// Create entities and add their meshes/bodies
const terrainData = createTerrain(world, materials);
scene.add(terrainData.mesh);
// Terrain body is static, no mesh syncing needed

const carData = createCar(world, materials);
scene.add(carData.mesh);
// Store car bodies for syncing
const carChassisBody = carData.physics.chassisBody;
const carWheelBodies = carData.physics.wheelBodies;
// Store car meshes for syncing (assuming order matches wheel bodies)
const carChassisMesh = carData.mesh.children[0] as THREE.Mesh; // Assuming chassis is first child
// NOTE: This relies on the structure in createCar. A more robust way would be to return named meshes.
// Wheels are now groups, starting after body + cabin
const carWheelGroups = carData.mesh.children.slice(2) as THREE.Group[]; 

// Get terrain dimensions 
const terrainWidth = 200;
const terrainHeight = 200;

// Create fences (visuals only needed in scene)
const fencesGroup = createFences(terrainWidth, terrainHeight, world, materials);
scene.add(fencesGroup);
// Fence bodies are static, no mesh syncing needed

// Setup controls
const controls = setupOrbitControls(camera, renderer.domElement);

// --- Animation Loop --- 
const clock = new THREE.Clock();
let oldElapsedTime = 0;

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - oldElapsedTime;
    oldElapsedTime = elapsedTime;

    // --- Physics Step ---
    // world.step(1 / 60, deltaTime); // Fixed step size, use delta for interpolation if needed
    if (deltaTime > 0) { // Prevent issues on first frame or pauses
        world.step(1 / 60, deltaTime, 3); // (fixed time step, time since last call, max sub-steps)
    }

    // --- Sync Meshes --- 
    // Sync car chassis
    carChassisMesh.position.copy(carChassisBody.position as any);
    carChassisMesh.quaternion.copy(carChassisBody.quaternion as any);

    // Sync wheels (now groups)
    for (let i = 0; i < carWheelBodies.length; i++) {
        if (carWheelGroups[i]) { // Check if group exists
            // Apply physics body transform to the entire wheel group
            carWheelGroups[i].position.copy(carWheelBodies[i].position as any);
            carWheelGroups[i].quaternion.copy(carWheelBodies[i].quaternion as any);
        }
    }

    // --- Update Controls --- 
    controls.update(); // Required for damping

    // --- Update Debugger --- 
    cannonDebugger.update();

    // --- Render --- 
    renderer.render(scene, camera);
}

// Start the animation loop
animate();

console.log("VibeOffroad game initialized with physics."); 