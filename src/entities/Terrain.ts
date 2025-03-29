import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsMaterials } from '../core/physicsSetup'; // Import the materials interface
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
    texture.repeat.set(64, 64); // Increase repeat for larger terrain
    texture.anisotropy = 16; // Improve texture appearance at glancing angles
    texture.needsUpdate = true;
    return texture;
}

export function createTerrain(world: CANNON.World, materials: PhysicsMaterials): {
    mesh: THREE.Mesh;
    body: CANNON.Body;
} {
    const width = 200; // Increased size
    const height = 200; // Increased size
    const widthSegments = 100; // Increased segments for larger size
    const heightSegments = 100; // Increased segments for larger size

    // Add ground plane (basic terrain)
    const planeGeometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);

    // Add simple height variation (noise)
    const positionAttribute = planeGeometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    const noiseScale1 = 0.05;
    const noiseStrength1 = 1.5; // Lower frequency, higher impact bumps
    const noiseScale2 = 0.2;
    const noiseStrength2 = 0.4; // Higher frequency, smaller details
    const noiseScale3 = 0.8;
    const noiseStrength3 = 0.1; // Very high frequency, tiny roughness

    const heightData: number[][] = [];
    let row: number[] = [];

    for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        
        // Layered noise calculation
        const noise1 = Math.sin(vertex.x * noiseScale1) * Math.cos(vertex.y * noiseScale1) * noiseStrength1;
        const noise2 = Math.sin(vertex.x * noiseScale2) * Math.cos(vertex.y * noiseScale2) * noiseStrength2;
        const noise3 = Math.sin(vertex.x * noiseScale3) * Math.cos(vertex.y * noiseScale3) * noiseStrength3;
        
        const heightOffset = noise1 + noise2 + noise3;
        const currentHeight = vertex.z + heightOffset; // Apply offset to base height (which is 0 for PlaneGeometry)
        positionAttribute.setZ(i, currentHeight);

        // Store height data for Cannon Heightfield
        // Need to map the linear buffer index to 2D grid indices
        const xIndex = i % (widthSegments + 1);
        const yIndex = Math.floor(i / (widthSegments + 1));
        if (xIndex === 0) { // Start of a new row
            if (row.length > 0) {
                 // Add previous row (reversed for Cannon's convention if needed - check docs)
                heightData.push(row.reverse());
            }
            row = [];
        }
        row.push(currentHeight);
    }
    // Add the last row
    if (row.length > 0) {
        heightData.push(row.reverse());
    }
    // Cannon needs the height data potentially reversed along one axis
    heightData.reverse(); 

    planeGeometry.computeVertexNormals(); // Recalculate normals for correct lighting

    const grassTexture = createGrassTexture();

    const planeMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        roughness: 0.9,
        metalness: 0.1,
        wireframe: false,
        side: THREE.DoubleSide
    });
    const groundPlaneMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    groundPlaneMesh.rotation.x = -Math.PI / 2;
    groundPlaneMesh.position.y = 0;
    // groundPlaneMesh.receiveShadow = true;

    // --- Create Cannon.js Body ---
    const groundShape = new CANNON.Heightfield(heightData, {
        elementSize: width / widthSegments // Distance between data points
    });

    const groundBody = new CANNON.Body({ 
        mass: 0, // Static body
        material: materials.groundMaterial 
    });
    groundBody.addShape(groundShape);
    // Adjust position and rotation to match the Three.js mesh
    // Heightfield is oriented differently, often needs rotation
    groundBody.position.set(-width / 2, 0, height / 2); // Center the heightfield
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    
    world.addBody(groundBody);
    // --- End of Cannon.js Body ---

    // TODO: Use a better noise function (e.g., simplex-noise library)
    // TODO: Add more detailed textures (normal map, roughness map)

    return { mesh: groundPlaneMesh, body: groundBody };
} 