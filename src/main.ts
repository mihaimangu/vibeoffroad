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

const INITIAL_CAMERA_OFFSET = new THREE.Vector3(0, 5, -10); // Offset used for starting view
const DESIRED_CAMERA_HEIGHT_OFFSET = INITIAL_CAMERA_OFFSET.y; // Extract desired height (e.g., 5)
const DESIRED_CAMERA_TOTAL_DISTANCE = INITIAL_CAMERA_OFFSET.length(); // Optional: ~11.18
// Calculate the desired horizontal distance based on total distance and height offset
const DESIRED_HORIZONTAL_DISTANCE = Math.sqrt(
    DESIRED_CAMERA_TOTAL_DISTANCE**2 - DESIRED_CAMERA_HEIGHT_OFFSET**2
); // Should be 10 if offset is (0, 5, -10)

// Define the mud zone boundaries (same as in Terrain.ts)
const mudZone = {
    minX: -30,
    maxX: 30,
    minZ: -15,
    maxZ: 15
};
// Store the normal wheel friction (from wheel options in Car.ts)
const normalWheelFriction = 1.5; // Get this from Car.ts wheelOptions if changed there
const mudWheelFriction = 0.1;  // Very low friction

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
        console.log("[main.ts] Instantiating VehicleControls with carData:", carData); // Log changed
        // Pass the full carData object now
        vehicleControls = new VehicleControls(carData);

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
    const dt = Math.min(deltaTime, 1 / 30);

    if (world && carData && vehicleControls && cannonDebugger && orbitControls) {
        vehicleControls.update(dt);
        world.step(dt);

        // Sync Meshes...
        const carPosition = carData.mesh.position; // Use visual mesh position for zone check
        carPosition.copy(carData.physics.chassisBody.position as unknown as THREE.Vector3);
        carData.mesh.quaternion.copy(carData.physics.chassisBody.quaternion as unknown as THREE.Quaternion);

        // --- Mud Zone Physics Check --- 
        const vehicle = carData.physics.vehicle;
        const currentFriction = vehicle.wheelInfos[0].frictionSlip; // Check current friction of one wheel
        const isInMud = (
            carPosition.x >= mudZone.minX && carPosition.x <= mudZone.maxX &&
            carPosition.z >= mudZone.minZ && carPosition.z <= mudZone.maxZ
        );

        let desiredFriction = normalWheelFriction;
        if (isInMud) {
            desiredFriction = mudWheelFriction;
        }

        // Only update friction if it needs to change
        if (currentFriction !== desiredFriction) {
            console.log(`Car ${isInMud ? 'entered' : 'exited'} mud zone. Changing wheel friction to ${desiredFriction}`);
            for (let i = 0; i < vehicle.wheelInfos.length; i++) {
                vehicle.wheelInfos[i].frictionSlip = desiredFriction;
            }
        }
        // --- End Mud Zone Check --- 

        // Sync Visual Wheels...
        // The loop for wheel position/rotation remains the same
        // const vehicle = carData.physics.vehicle; // Already defined above
        for (let i = 0; i < vehicle.wheelInfos.length; i++) {
             vehicle.updateWheelTransform(i);
             const transform = vehicle.wheelInfos[i].worldTransform;
             let visualWheel: THREE.Object3D | undefined;
             switch (i) { /* ... cases ... */ }
             if (visualWheel) { /* ... sync ... */ }
        }
        
        // Update Camera...
        orbitControls.target.copy(carPosition);
        orbitControls.update();
        // Enforce distance...
        // ... (camera distance logic) ...

        // Update Debugger...
        cannonDebugger.update(); 
    }

    // Render Scene...
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
        setupEventListeners();
    } else {
        console.error("Initialization check failed before starting animation loop.");
        // Display error message on the page if desired
    }
}).catch(err => {
    console.error("Initialization promise failed:", err);
}); 

// --- Attach Event Listeners AFTER Initialization ---
function setupEventListeners() {
     console.log("Setting up event listeners...");
    // --- Reset Button Listener --- 
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        console.log("Reset button element FOUND.");
        resetButton.addEventListener('click', () => {
            console.log("Reset button CLICKED - Listener is working!");
            resetCar(); // Call the reset function
        });
    } else {
        console.warn("Reset button element NOT FOUND! Check index.html for typo in id='reset-button'."); 
    }

    // --- Parking Brake Button Listener --- 
    const parkingBrakeButton = document.getElementById('parking-brake-button');
    // We know vehicleControls exists if we call this function after successful init
    if (parkingBrakeButton && vehicleControls) {
         console.log("Parking brake button element FOUND.");
         parkingBrakeButton.addEventListener('click', () => {
             console.log("Parking brake button CLICKED");
             vehicleControls!.toggleParkingBrake(); // Use non-null assertion or ensure check
         });
    } else {
         if (!parkingBrakeButton) console.warn("Parking brake button element NOT FOUND!");
         // This case should ideally not happen if called correctly
         else console.warn("VehicleControls instance missing when setting up parking brake listener!"); 
    }

    // --- Drive Mode Button Listener ---
    const driveModeButton = document.getElementById('drive-mode-button');
    if (driveModeButton && vehicleControls) {
        console.log("Drive mode button element FOUND.");
        driveModeButton.addEventListener('click', () => {
            console.log("Drive mode button CLICKED");
            vehicleControls!.toggleDriveMode();
        });
    } else {
        if (!driveModeButton) console.warn("Drive mode button element NOT FOUND!");
        else console.warn("VehicleControls instance missing when setting up drive mode listener!");
    }
} 