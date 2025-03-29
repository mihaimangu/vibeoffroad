import * as THREE from 'three';

export function createTerrain(): THREE.Mesh {
    // Add ground plane (basic terrain)
    const planeGeometry = new THREE.PlaneGeometry(100, 100, 50, 50); // Increased segments for potential displacement later
    const planeMaterial = new THREE.MeshStandardMaterial({
        color: 0x664422, // Brownish color
        wireframe: false, // Set to true to see geometry
        side: THREE.DoubleSide
    });
    const groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    groundPlane.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    groundPlane.position.y = 0; // Position at the base
    // Allow the ground plane to receive shadows
    // groundPlane.receiveShadow = true;

    // TODO: Add height variations, textures, etc.

    return groundPlane;
} 