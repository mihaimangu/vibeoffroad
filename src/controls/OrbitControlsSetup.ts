import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function setupOrbitControls(camera: THREE.PerspectiveCamera, domElement: HTMLCanvasElement): OrbitControls {
    // Add Camera Controls
    const controls = new OrbitControls(camera, domElement);
    controls.enableDamping = true; // Optional: adds inertia to camera movement
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false; // Optional: keep panning behavior consistent
    controls.minDistance = 5; // Adjusted min distance
    controls.maxDistance = 80; // Adjusted max distance
    // controls.maxPolarAngle = Math.PI / 2; // Optional: prevent camera from going below ground

    // Make the controls target the car's approximate position initially
    // This assumes the car is centered at (0, ~1, 0)
    // We might want to pass the car object later for more dynamic targeting
    controls.target.set(0, 1, 0);
    controls.update(); // Required after setting target

    return controls;
} 