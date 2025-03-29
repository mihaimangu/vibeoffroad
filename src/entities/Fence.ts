import * as THREE from 'three';

interface FenceParameters {
    postHeight: number;
    postRadius: number;
    postSpacing: number;
    railHeight: number;
    railDepth: number;
    railOffsetY: number; // Vertical offset for rails on the post
    color: THREE.ColorRepresentation;
}

export function createFences(terrainWidth: number, terrainHeight: number): THREE.Group {
    const params: FenceParameters = {
        postHeight: 1.5,
        postRadius: 0.1,
        postSpacing: 4,
        railHeight: 0.15,
        railDepth: 0.08,
        railOffsetY: 0.5, // How far up the post the lower rail starts
        color: 0x8B4513 // SaddleBrown color
    };

    const fenceGroup = new THREE.Group();
    const postGeometry = new THREE.CylinderGeometry(params.postRadius, params.postRadius, params.postHeight, 8);
    const railGeometry = new THREE.BoxGeometry(params.postSpacing, params.railHeight, params.railDepth);
    const fenceMaterial = new THREE.MeshStandardMaterial({ 
        color: params.color,
        roughness: 0.8,
        metalness: 0.1
    });

    const halfWidth = terrainWidth / 2;
    const halfHeight = terrainHeight / 2;

    // Function to create one side of the fence
    const createFenceLine = (start: THREE.Vector3, direction: THREE.Vector3, length: number) => {
        const numPosts = Math.ceil(length / params.postSpacing) + 1;
        const actualSpacing = length / (numPosts - 1);

        for (let i = 0; i < numPosts; i++) {
            // Create Post
            const post = new THREE.Mesh(postGeometry, fenceMaterial);
            const postPos = start.clone().addScaledVector(direction, i * actualSpacing);
            post.position.set(postPos.x, params.postHeight / 2, postPos.z);
            // post.castShadow = true;
            fenceGroup.add(post);

            // Create Rails (except for the last post)
            if (i < numPosts - 1) {
                // Lower Rail
                const railLower = new THREE.Mesh(railGeometry, fenceMaterial);
                const railPosLower = post.position.clone().addScaledVector(direction, actualSpacing / 2);
                railLower.position.set(railPosLower.x, params.railOffsetY, railPosLower.z);
                railLower.lookAt(post.position.clone().setY(railLower.position.y)); // Orient rail
                // railLower.castShadow = true;
                fenceGroup.add(railLower);

                // Upper Rail
                const railUpper = railLower.clone();
                railUpper.position.y = params.railOffsetY + params.railHeight + 0.3; // Position above lower rail
                fenceGroup.add(railUpper);
            }
        }
    };

    // Create the four fence lines
    const edgeOffset = 0.1; // Small offset from the absolute edge
    // Positive Z edge
    createFenceLine(new THREE.Vector3(-halfWidth + edgeOffset, 0, halfHeight - edgeOffset), new THREE.Vector3(1, 0, 0), terrainWidth - 2 * edgeOffset);
    // Negative Z edge
    createFenceLine(new THREE.Vector3(-halfWidth + edgeOffset, 0, -halfHeight + edgeOffset), new THREE.Vector3(1, 0, 0), terrainWidth - 2 * edgeOffset);
    // Positive X edge
    createFenceLine(new THREE.Vector3(halfWidth - edgeOffset, 0, -halfHeight + edgeOffset), new THREE.Vector3(0, 0, 1), terrainHeight - 2 * edgeOffset);
    // Negative X edge
    createFenceLine(new THREE.Vector3(-halfWidth + edgeOffset, 0, -halfHeight + edgeOffset), new THREE.Vector3(0, 0, 1), terrainHeight - 2 * edgeOffset);

    return fenceGroup;
} 