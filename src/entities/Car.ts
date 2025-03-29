import * as THREE from 'three';

export function createCar(): THREE.Group {
    // Create a simple placeholder car
    const car = new THREE.Group();

    const bodyHeight = 0.6;
    const wheelRadius = 0.4;
    const wheelHeight = 0.3;

    // Car Body
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x0055ff, flatShading: false }); // Blue body
    const bodyGeometry = new THREE.BoxGeometry(2, bodyHeight, 4); // width, height, length
    const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    carBody.position.y = bodyHeight / 2 + wheelRadius; // Position based on wheel radius and body height
    // Enable shadows for the body
    // carBody.castShadow = true;
    // carBody.receiveShadow = true; // Body can receive shadows from cabin
    car.add(carBody);

    // Optional: Add a simple cabin
    const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, flatShading: false }); // Light grey cabin
    const cabinGeometry = new THREE.BoxGeometry(1.8, 0.8, 2.5); // Slightly smaller than body
    const carCabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    // Position cabin relative to the top of the body
    carCabin.position.set(0, carBody.position.y + bodyHeight / 2 + 0.8 / 2, -0.2);
    // Enable shadows for the cabin
    // carCabin.castShadow = true;
    // carCabin.receiveShadow = false; // Cabin likely won't receive shadows
    car.add(carCabin);

    // Car Wheels
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, flatShading: false }); // Dark grey wheels
    const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelHeight, 18); // Use constants
    wheelGeometry.rotateZ(Math.PI / 2); // Rotate wheels to align correctly

    const wheelPositions = [
        new THREE.Vector3(-1.1, wheelRadius, 1.3),  // Front Left
        new THREE.Vector3(1.1, wheelRadius, 1.3),   // Front Right
        new THREE.Vector3(-1.1, wheelRadius, -1.3), // Rear Left
        new THREE.Vector3(1.1, wheelRadius, -1.3)   // Rear Right
    ];

    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.copy(pos);
        // Enable shadows for wheels
        // wheel.castShadow = true;
        // wheel.receiveShadow = true; // Wheels can receive shadows
        car.add(wheel);
    });

    // Position the entire car group so wheels are on y=0
    car.position.y = 0;

    // TODO: Replace with actual GLTF model loading
    // TODO: Add physics components (body, wheels)

    return car;
} 