import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsMaterials } from '../core/physicsSetup';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface CarPhysics { // To return physics components
    chassisBody: CANNON.Body;
    wheelBodies: CANNON.Body[];
    // Constraints will be added later
}

export async function createCar(world: CANNON.World, materials: PhysicsMaterials): Promise<{
    mesh: THREE.Group;
    physics: CarPhysics;
}> {
    // Instantiate the loader
    const loader = new GLTFLoader();

    // --- Load the GLB model --- 
    const gltf = await loader.loadAsync('/models/car.glb');
    const carMesh = gltf.scene;
    // Optional: Scale the loaded model if necessary
    // carMesh.scale.set(0.5, 0.5, 0.5);
    // Optional: Ensure meshes cast/receive shadows
    carMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            // child.castShadow = true;
            // child.receiveShadow = true;
        }
    });
    // We will position this mesh group based on the physics body later

    // --- Dimensions (Estimates for Physics - adjust based on loaded model visuals) ---
    const chassisWidth = 1.8; // Estimate based on visual size
    const chassisHeight = 0.7; // Estimate
    const chassisLength = 4.0; // Estimate
    const chassisMass = 150; 

    const wheelRadius = 0.4; // Estimate
    const wheelThickness = 0.3; // Used for visual positioning offset before
    const wheelMass = 10;

    // --- Physics Shapes (Keep using simple primitives for now) --- 
    const chassisShape = new CANNON.Box(new CANNON.Vec3(chassisWidth / 2, chassisHeight / 2, chassisLength / 2));
    const wheelShape = new CANNON.Sphere(wheelRadius); 

    // --- Chassis Physics Body --- 
    const chassisYOffset = wheelRadius; // Simplified offset for physics start
    const chassisBody = new CANNON.Body({
        mass: chassisMass,
        material: materials.carMaterial,
        position: new CANNON.Vec3(0, chassisYOffset + 1.0, 0), // Start slightly above ground
        shape: chassisShape,
        angularDamping: 0.5 // Add some damping
    });
    world.addBody(chassisBody);

    // --- Wheels Physics Bodies & Constraints --- 
    const wheelBodies: CANNON.Body[] = [];
    // Pivot points relative to the chassis center (adjust if needed based on model)
    const wheelPositions = [
        new CANNON.Vec3(-chassisWidth / 2, 0, chassisLength / 2 * 0.7), 
        new CANNON.Vec3( chassisWidth / 2, 0, chassisLength / 2 * 0.7), 
        new CANNON.Vec3(-chassisWidth / 2, 0, -chassisLength / 2 * 0.7), 
        new CANNON.Vec3( chassisWidth / 2, 0, -chassisLength / 2 * 0.7), 
    ];
    const wheelAxis = new CANNON.Vec3(1, 0, 0); // Hinge axis

    wheelPositions.forEach((pos, index) => {
        // Calculate world position for the wheel body
        const wheelWorldPos = chassisBody.position.clone().vadd(pos); 
        // We don't offset Y here as the pivot is relative to chassis center Y=0
        wheelWorldPos.y = wheelRadius; // But start the body at wheel radius height

        const wheelBody = new CANNON.Body({
            mass: wheelMass,
            material: materials.wheelMaterial,
            shape: wheelShape, 
            position: wheelWorldPos,
            angularDamping: 0.5 
        });
        world.addBody(wheelBody);
        wheelBodies.push(wheelBody);

        // Create Hinge Constraint
        const constraint = new CANNON.HingeConstraint(chassisBody, wheelBody, {
            pivotA: pos, // Pivot relative to chassis center
            pivotB: new CANNON.Vec3(0, 0, 0), // Pivot relative to wheel center
            axisA: wheelAxis,
            axisB: wheelAxis
        });
        world.addConstraint(constraint);
    });

    // No need to position carMesh here, it will be synced in main.ts

    const carPhysics: CarPhysics = {
        chassisBody,
        wheelBodies
    };

    // Return the loaded mesh and the physics components
    return { mesh: carMesh, physics: carPhysics }; 
} 