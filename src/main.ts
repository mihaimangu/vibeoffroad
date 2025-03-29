// Entry point for the VibeOffroad game

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger'; // Import the debugger

// Import global styles
import '../src/style.css';

import { setupScene } from './core/sceneSetup';
import { setupPhysicsWorld } from './core/physicsSetup';
import { createTerrain } from './entities/Terrain';
import { createCar, CarData } from './entities/Car';
import { createFences } from './entities/Fence';
// import { setupOrbitControls } from './controls/OrbitControlsSetup'; // Comment out OrbitControls
import { VehicleControls } from './controls/VehicleControls';
import { FollowCamera } from './controls/FollowCamera'; // Import FollowCamera
// Import OrbitControls
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Constants ---
const INITIAL_CAR_POSITION = new CANNON.Vec3(0, 1.5, 0); // Initial Y position might need adjustment
const INITIAL_CAR_QUATERNION = new CANNON.Quaternion(); // Default orientation (no rotation)
INITIAL_CAR_QUATERNION.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0); // Explicitly set no rotation around Y
const INITIAL_CAMERA_OFFSET = new THREE.Vector3(0, 5, -10); // Define offset for reuse
const DESIRED_CAMERA_DISTANCE = INITIAL_CAMERA_OFFSET.length(); // Calculate distance automatically

// --- Global Scope Variables ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
let world: CANNON.World;
let cannonDebugger: ReturnType<typeof CannonDebugger>;
let followCamera: FollowCamera | null = null;
let orbitControls: OrbitControls | null = null;
let vehicleControls: VehicleControls | null = null;
let carData: CarData | null = null;
const clock = new THREE.Clock();

// --- Initialization Function ---
async function initializeGame() {
    // Basic Scene Setup
    scene.background = new THREE.Color(0x87ceeb); 
    camera.position.set(10, 10, 10); 
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(20, 30, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Physics Setup
    const physicsSetup = setupPhysicsWorld();
    world = physicsSetup.world; // Assign to global scope variable
    const materials = physicsSetup.materials;

    // Physics Debugger
    cannonDebugger = CannonDebugger(scene, world, { 
        color: 0x0000ff, // Blue wireframes
        scale: 1.0
    });

    // --- Setup OrbitControls --- 
    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true; // Optional: adds inertia to camera movement
    orbitControls.dampingFactor = 0.1;
    orbitControls.screenSpacePanning = false; // Optional: Adjust panning behavior
    // Don't set a fixed target yet, we'll update it dynamically

    // Load Game Entities
    try {
        // Load terrain
        const terrainData = await createTerrain(world, materials);
        if (terrainData) scene.add(terrainData.mesh);

        // Load car
        carData = await createCar(world, materials); // Returns CarData
        if (!carData) throw new Error("Car creation failed");
        scene.add(carData.mesh);

        // Instantiate VehicleControls *after* car is created
        vehicleControls = new VehicleControls(carData.physics);

        // Instantiate FollowCamera *after* car mesh is available
        followCamera = new FollowCamera(camera, carData.mesh);
        
        // Set initial OrbitControls target
        if (orbitControls && carData) {
            const carPosition = carData.mesh.position;
            orbitControls.target.copy(carPosition);
            
            // Calculate initial camera position (behind and above the car)
            const initialCameraPos = carPosition.clone().add(INITIAL_CAMERA_OFFSET);
            camera.position.copy(initialCameraPos);
            camera.lookAt(carPosition); // Ensure camera looks at the car initially

            orbitControls.update(); // Update controls after setting position and target
        }

        // Load other entities like fences if needed
        // const fence = createFence(world, materials);
        // if (fence) scene.add(fence);

        console.log("Game initialized successfully!");

    } catch (error) {
        console.error("Failed to initialize game entities:", error);
        // Display error message to user?
    }
}

// --- Reset Function ---
function resetCar() {
    if (!carData) return;

    const chassisBody = carData.physics.chassisBody;
    const vehicle = carData.physics.vehicle;

    // Reset position and orientation
    chassisBody.position.copy(INITIAL_CAR_POSITION);
    chassisBody.quaternion.copy(INITIAL_CAR_QUATERNION);

    // Reset velocities
    chassisBody.velocity.set(0, 0, 0);
    chassisBody.angularVelocity.set(0, 0, 0);

    // Reset vehicle-specific states (like steering)
    vehicle.setSteeringValue(0, 0);
    vehicle.setSteeringValue(0, 1);
    vehicle.applyEngineForce(0, 2); 
    vehicle.applyEngineForce(0, 3);
    vehicle.setBrake(0, 0);
    vehicle.setBrake(0, 1);
    vehicle.setBrake(0, 2);
    vehicle.setBrake(0, 3);

    // If you have other states (like control state in VehicleControls), 
    // you might want to reset them too, e.g., by calling a reset method on vehicleControls
    if (vehicleControls) {
        // TODO: Consider adding a reset method to VehicleControls if needed
        // vehicleControls.reset(); 
    }

    console.log("Car reset!");
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    const dt = Math.min(deltaTime, 1 / 30); // Cap physics step time

    // Only run simulation if initialized correctly
    if (world && carData && vehicleControls && cannonDebugger && orbitControls) {
        // 1. Update Controls (Calculate forces/steering)
        vehicleControls.update(dt);

        // 2. Step Physics World
        world.step(dt);

        // 3. Sync Main Car Mesh (Chassis)
        carData.mesh.position.copy(carData.physics.chassisBody.position as unknown as THREE.Vector3);
        carData.mesh.quaternion.copy(carData.physics.chassisBody.quaternion as unknown as THREE.Quaternion);

        // 4. Sync Visual Wheels from Raycast Vehicle
        const vehicle = carData.physics.vehicle;
        for (let i = 0; i < vehicle.wheelInfos.length; i++) {
            vehicle.updateWheelTransform(i); // CRITICAL: Update the transform before reading it
            const transform = vehicle.wheelInfos[i].worldTransform;
            let visualWheel: THREE.Object3D | undefined;
            
            // Match index to visual wheel object (Ensure this order matches createCar)
            switch (i) {
                case 0: visualWheel = carData.visualWheels.frontLeft; break;
                case 1: visualWheel = carData.visualWheels.frontRight; break;
                case 2: visualWheel = carData.visualWheels.rearLeft; break;
                case 3: visualWheel = carData.visualWheels.rearRight; break;
            }

            if (visualWheel) {
                visualWheel.position.copy(transform.position as unknown as THREE.Vector3);
                visualWheel.quaternion.copy(transform.quaternion as unknown as THREE.Quaternion);
            } 
            // Optional: Add a less frequent log if a wheel is missing
            // else if (i === 0 && clock.elapsedTime % 5 < dt) { 
            //     console.warn(`Visual wheel mesh (e.g., 'Wheel_Front_Left') not found or named incorrectly in GLB.`);
            // }
        }
        
        // --- Update OrbitControls Target --- 
        orbitControls.target.copy(carData.mesh.position); // Make the controls orbit around the car's current position
        orbitControls.update(); // CRITICAL: Update OrbitControls to process user input and target change

        // --- Enforce Constant Camera Distance --- 
        const targetPosition = orbitControls.target; // Use the target we just set
        const cameraPosition = camera.position;
        const direction = new THREE.Vector3();
        direction.subVectors(cameraPosition, targetPosition).normalize(); // Get direction from target to camera
        
        // Calculate the new desired position
        const newCameraPosition = targetPosition.clone().addScaledVector(direction, DESIRED_CAMERA_DISTANCE);
        
        // Apply the new position
        camera.position.copy(newCameraPosition);
        // No need to call camera.lookAt(target) here, OrbitControls handles the looking direction
        // No need to call orbitControls.update() again here, we just adjusted the final position

        // 6. Update Debugger
        cannonDebugger.update(); 
    }

    // 7. Render Scene
    renderer.render(scene, camera);
}

// --- Window Resize Handler ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// --- Start the Application ---
initializeGame().then(() => {
    if (carData && vehicleControls && followCamera && world) {
        console.log("Starting animation loop.");
        resetCar();
        animate();
    } else {
        console.error("Initialization check failed before starting animation loop.");
        // Display error message on the page if desired
    }
}).catch(err => {
    console.error("Initialization promise failed:", err);
}); 

// --- Add Event Listener for Reset Button ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired."); // Log 1: Did the event fire?
    const resetButton = document.getElementById('reset-button');
    
    if (resetButton) {
        console.log("Reset button element FOUND."); // Log 2: Did we find the element?
        resetButton.addEventListener('click', () => {
            console.log("Reset button CLICKED - Listener is working!"); // Log 3: Did the click register?
            resetCar(); // Call the reset function
        });
    } else {
        // This log is important!
        console.warn("Reset button element NOT FOUND! Check index.html for typo in id='reset-button' or script timing."); 
    }
}); 