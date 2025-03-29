import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsMaterials } from '../core/physicsSetup';

interface FenceParameters {
    postHeight: number;
    postRadius: number;
    postSpacing: number;
    railHeight: number;
    railDepth: number;
    railOffsetY: number; // Vertical offset for rails on the post
    color: THREE.ColorRepresentation;
}

export function createFences(terrainWidth: number, terrainHeight: number, world: CANNON.World, materials: PhysicsMaterials): THREE.Group {
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
    const postMeshGeometry = new THREE.CylinderGeometry(params.postRadius, params.postRadius, params.postHeight, 8);
    const railMeshGeometry = new THREE.BoxGeometry(params.postSpacing, params.railHeight, params.railDepth);
    const fenceMaterial = new THREE.MeshStandardMaterial({ 
        color: params.color,
        roughness: 0.8,
        metalness: 0.1
    });

    // Physics Shapes (dimensions are half-extents for Box)
    const postShape = new CANNON.Cylinder(params.postRadius, params.postRadius, params.postHeight, 8);
    // Box shape takes half-extents
    const railShape = new CANNON.Box(new CANNON.Vec3(params.postSpacing / 2, params.railHeight / 2, params.railDepth / 2));

    const halfWidth = terrainWidth / 2;
    const halfHeight = terrainHeight / 2;

    // Function to create one side of the fence
    const createFenceLine = (start: THREE.Vector3, direction: THREE.Vector3, length: number) => {
        const numPosts = Math.ceil(length / params.postSpacing) + 1;
        const actualSpacing = length / (numPosts - 1);

        for (let i = 0; i < numPosts; i++) {
            const postMeshPos = start.clone().addScaledVector(direction, i * actualSpacing);
            postMeshPos.y = params.postHeight / 2;

            // Create Post Mesh
            const postMesh = new THREE.Mesh(postMeshGeometry, fenceMaterial);
            postMesh.position.copy(postMeshPos);
            // postMesh.castShadow = true;
            fenceGroup.add(postMesh);

            // Create Post Physics Body
            const postBody = new CANNON.Body({
                mass: 0, // Static
                material: materials.fenceMaterial,
                shape: postShape,
                position: new CANNON.Vec3(postMeshPos.x, postMeshPos.y, postMeshPos.z)
            });
            world.addBody(postBody);

            // Create Rails (except for the last post)
            if (i < numPosts - 1) {
                const railDirection = direction.clone().multiplyScalar(actualSpacing);
                const railCenterOffset = railDirection.clone().multiplyScalar(0.5);
                const railMeshBasePos = postMeshPos.clone().add(railCenterOffset);
                
                // Helper to create rail mesh and body
                const addRail = (offsetY: number) => {
                    const railMeshPos = railMeshBasePos.clone();
                    railMeshPos.y = offsetY;

                    const railMesh = new THREE.Mesh(railMeshGeometry, fenceMaterial);
                    railMesh.position.copy(railMeshPos);
                    // Orient mesh: Use a quaternion based on the direction vector
                    const angle = Math.atan2(direction.x, direction.z);
                    railMesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                    // railMesh.castShadow = true;
                    fenceGroup.add(railMesh);

                    // Create Rail Physics Body
                    const railBody = new CANNON.Body({
                        mass: 0, // Static
                        material: materials.fenceMaterial,
                        shape: railShape,
                        position: new CANNON.Vec3(railMeshPos.x, railMeshPos.y, railMeshPos.z),
                        // Use the same orientation as the mesh
                        quaternion: new CANNON.Quaternion().copy(railMesh.quaternion as any) // Type assertion needed
                    });
                    world.addBody(railBody);
                };
                
                // Lower Rail
                addRail(params.railOffsetY);
                // Upper Rail
                addRail(params.railOffsetY + params.railHeight + 0.3); 
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