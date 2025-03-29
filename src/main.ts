// Entry point for the VibeOffroad game

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Basic Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('gameCanvas') as HTMLCanvasElement
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add Camera Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Optional: adds inertia to camera movement
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false; // Optional: keep panning behavior consistent
controls.minDistance = 2; // Optional: limit zoom in
controls.maxDistance = 50; // Optional: limit zoom out
// controls.maxPolarAngle = Math.PI / 2; // Optional: prevent camera from going below ground

// Add Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Add a simple cube (placeholder for vehicle later)
// const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
// const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red cube, standard material
// const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
// cube.position.y = 0.5; // Place cube slightly above the ground plane
// scene.add(cube);

// Create a simple placeholder car
const car = new THREE.Group();
scene.add(car);

// Car Body
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x0055ff }); // Blue body
const bodyGeometry = new THREE.BoxGeometry(2, 0.6, 4); // width, height, length
const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
carBody.position.y = 0.6; // Lift the body slightly
car.add(carBody);

// Optional: Add a simple cabin
const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc }); // Light grey cabin
const cabinGeometry = new THREE.BoxGeometry(1.8, 0.8, 2.5); // Slightly smaller than body
const carCabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
carCabin.position.set(0, 1.0, -0.2); // Position on top of the body, slightly back
car.add(carCabin);


// Car Wheels
const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 }); // Dark grey wheels
const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 18); // radiusTop, radiusBottom, height, radialSegments
wheelGeometry.rotateZ(Math.PI / 2); // Rotate wheels to align correctly

const wheelPositions = [
    new THREE.Vector3(-1.1, 0.4, 1.3),  // Front Left
    new THREE.Vector3(1.1, 0.4, 1.3),   // Front Right
    new THREE.Vector3(-1.1, 0.4, -1.3), // Rear Left
    new THREE.Vector3(1.1, 0.4, -1.3)   // Rear Right
];

wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.copy(pos);
    car.add(wheel);
});

// Position the entire car group
car.position.y = 0; // Car group's base is on the ground plane (wheels touch)

// Add ground plane (basic terrain)
const planeGeometry = new THREE.PlaneGeometry(100, 100); // Large plane
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, side: THREE.DoubleSide }); // Forest green
const groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
groundPlane.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
groundPlane.position.y = 0; // Position at the base
scene.add(groundPlane);

camera.position.set(0, 5, 10); // Adjust camera position for better view
camera.lookAt(scene.position); // Make camera look at the center

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Update Controls
    controls.update(); // Only required if controls.enableDamping = true, or if controls.autoRotate = true

    // Cube rotation - Removed for now to focus on camera controls
    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;

    renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

console.log("Three.js scene initialized."); 