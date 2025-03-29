import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsMaterials } from '../core/physicsSetup'; // Import the materials interface
// Consider importing a noise library like 'simplex-noise' or use THREE.MathUtils for simple noise

// Function to create a simple procedural grass texture
function createGrassTexture(terrainWidth: number, terrainHeight: number, mudZone: { minX: number, maxX: number, minZ: number, maxZ: number }): THREE.CanvasTexture {
    const canvasSize = 256; // Increase canvas size for better detail?
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const context = canvas.getContext('2d')!;

    for (let y = 0; y < canvasSize; y++) {
        for (let x = 0; x < canvasSize; x++) {
            // Map canvas coords (0-canvasSize) to world coords (-width/2 to +width/2)
            // Texture T coord (y) maps to World Z, Texture S coord (x) maps to World X
            const worldX = (x / canvasSize) * terrainWidth - terrainWidth / 2;
            const worldZ = (y / canvasSize) * terrainHeight - terrainHeight / 2; 
            // Note: THREE.PlaneGeometry maps texture differently than expected sometimes.
            // Let's assume Y on canvas maps to World Z for now, adjust if needed.

            let r = 0, g = 0, b = 0;
            // Check if the current world coordinate is inside the mud zone
            if (worldX >= mudZone.minX && worldX <= mudZone.maxX && worldZ >= mudZone.minZ && worldZ <= mudZone.maxZ) {
                // Draw Mud Color
                r = 80 + Math.random() * 40; // 80 - 120 (Brownish)
                g = 60 + Math.random() * 30; // 60 - 90
                b = 40 + Math.random() * 20; // 40 - 60
            } else {
                // Draw Grass Color (existing logic)
                const random = Math.random();
                if (random < 0.8) {
                    g = 100 + Math.random() * 100; 
                    r = g * (0.6 + Math.random() * 0.2); 
                    b = 20 + Math.random() * 30;
                } else if (random < 0.95) {
                    r = 100 + Math.random() * 80;
                    g = 100 + Math.random() * 50;
                    b = 20 + Math.random() * 20;
                } else {
                    g = 50 + Math.random() * 50;
                    r = g * (0.8 + Math.random() * 0.2);
                    b = 10 + Math.random() * 20;
                }
            }

            context.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
            context.fillRect(x, y, 1, 1);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1); // Do not repeat the texture, use the full map
    texture.anisotropy = 16; 
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

    // --- Define Mud Zone World Coordinates --- 
    const mudZone = {
        minX: -30,
        maxX: 30,
        minZ: -15,
        maxZ: 15
    };

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

    // Generate texture WITH the mud zone defined
    const terrainTexture = createGrassTexture(width, height, mudZone);

    const planeMaterial = new THREE.MeshStandardMaterial({
        map: terrainTexture, // Use the generated texture
        roughness: 0.9,
        metalness: 0.1,
        // wireframe: false, // Keep wireframe off for texture visibility
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