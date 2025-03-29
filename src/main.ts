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
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red cube, standard material
const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.y = 0.5; // Place cube slightly above the ground plane
scene.add(cube);

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