import * as THREE from 'three';
// Consider importing a noise library like 'simplex-noise' or use THREE.MathUtils for simple noise

// Function to create a simple procedural grass texture
function createGrassTexture(): THREE.CanvasTexture {
    const canvasSize = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const context = canvas.getContext('2d')!;

    for (let y = 0; y < canvasSize; y++) {
        for (let x = 0; x < canvasSize; x++) {
            // Simple noise pattern with green variations
            const random = Math.random();
            let r = 0, g = 0, b = 0;
            if (random < 0.8) {
                // Mostly green
                g = 100 + Math.random() * 100; // 100 - 200
                r = g * (0.6 + Math.random() * 0.2); // Slightly brownish/yellowish green
                b = 20 + Math.random() * 30;
            } else if (random < 0.95) {
                // Patches of brownish/yellow
                r = 100 + Math.random() * 80;
                g = 100 + Math.random() * 50;
                b = 20 + Math.random() * 20;
            } else {
                // Darker patches
                g = 50 + Math.random() * 50;
                r = g * (0.8 + Math.random() * 0.2);
                b = 10 + Math.random() * 20;
            }

            context.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
            context.fillRect(x, y, 1, 1);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(32, 32); // Repeat the texture many times across the plane
    texture.anisotropy = 16; // Improve texture appearance at glancing angles
    texture.needsUpdate = true;
    return texture;
}

export function createTerrain(): THREE.Mesh {
    const width = 100;
    const height = 100;
    const widthSegments = 50;
    const heightSegments = 50;

    // Add ground plane (basic terrain)
    const planeGeometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);

    // Add simple height variation (noise)
    const positionAttribute = planeGeometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    const noiseStrength = 0.3; // How bumpy the terrain is

    for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);

        // Simple pseudo-random noise based on vertex position
        // Using a proper noise function (Simplex, Perlin) would be better
        // Apply noise to the original Z value (which corresponds to Y-up in world space after rotation)
        const heightOffset = (Math.sin(vertex.x * 0.2) * Math.cos(vertex.y * 0.2)) * noiseStrength;

        // Update the Z coordinate (height in the geometry's local space)
        positionAttribute.setZ(i, vertex.z + heightOffset);
    }
    planeGeometry.computeVertexNormals(); // Recalculate normals for correct lighting


    const grassTexture = createGrassTexture();

    const planeMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        // color: 0x664422, // Color is now driven by the texture map
        roughness: 0.9, // More rough for a natural ground look
        metalness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    });
    const groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    groundPlane.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    groundPlane.position.y = 0; // Position at the base
    // Allow the ground plane to receive shadows
    // groundPlane.receiveShadow = true;

    // TODO: Use a better noise function (e.g., simplex-noise library)
    // TODO: Add more detailed textures (normal map, roughness map)

    return groundPlane;
} 