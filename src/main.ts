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

async function initializeGame() { // Wrap initialization in an async function
    // Initialize core components
    const { scene, camera, renderer } = setupScene();

    // Initialize physics world
    const { world, materials } = setupPhysicsWorld();

    // Initialize physics debugger
    const cannonDebugger = CannonDebugger(scene, world, {
        color: 0x00ff00, // Wireframe color
        scale: 1.0, // Optional: scale the debug meshes
    });

    // Create entities and add their meshes/bodies
    const terrainData = createTerrain(world, materials);
    scene.add(terrainData.mesh);
    // Terrain body is static, no mesh syncing needed

    // --- Load Car Asynchronously --- 
    const carData = await createCar(world, materials); // Use await here
    scene.add(carData.mesh); // Add the loaded GLTF scene
    const carChassisBody = carData.physics.chassisBody;
    // We no longer need direct references to visual wheel meshes/groups

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
        if (deltaTime > 0) {
            world.step(1 / 60, deltaTime, 3); 
        }

        // --- Sync Meshes --- 
        // Sync the entire loaded car model to the chassis physics body
        carData.mesh.position.copy(carChassisBody.position as any);
        carData.mesh.quaternion.copy(carChassisBody.quaternion as any);
        // Individual wheel visual sync is not needed as they are part of the loaded model
        
        // --- Update Controls --- 
        controls.update(); 

        // --- Update Debugger --- 
        cannonDebugger.update();

        // --- Render --- 
        renderer.render(scene, camera);
    }

    // Start the animation loop
    animate();

    console.log("VibeOffroad game initialized with GLTF model and physics.");
}

// Run the async initialization function
initializeGame().catch(error => {
    console.error("Failed to initialize game:", error);
}); 