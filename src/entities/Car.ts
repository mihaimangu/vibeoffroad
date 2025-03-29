import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsMaterials } from '../core/physicsSetup';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface CarPhysics { // To return physics components
    chassisBody: CANNON.Body;
    wheelBodies: CANNON.Body[];
    wheelConstraints: CANNON.HingeConstraint[]; // Add constraints here
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
    const chassisWidth = 1.8;
    const chassisHeight = 0.2; // Keep thin for clearance
    const chassisLength = 4.0;
    const chassisMass = 800; // --- Significantly Increased Mass ---

    const wheelRadius = 0.35;
    const wheelMass = 25; // --- Increased Wheel Mass ---

    // --- Physics Shapes (Keep using simple primitives for now) --- 
    // Use updated chassisHeight
    const chassisShape = new CANNON.Box(new CANNON.Vec3(chassisWidth / 2, chassisHeight / 2, chassisLength / 2));
    // Use updated wheelRadius
    const wheelShape = new CANNON.Sphere(wheelRadius); 

    // --- Chassis Physics Body --- 
    const initialChassisY = wheelRadius + 0.8; // Keep starting high for now
    const chassisBody = new CANNON.Body({
        mass: chassisMass,
        material: materials.carMaterial,
        position: new CANNON.Vec3(0, initialChassisY, 0), 
        shape: chassisShape,
        linearDamping: 0.3, // --- Added Linear Damping ---
        angularDamping: 0.5 
    });
    world.addBody(chassisBody);

    // --- Wheels Physics Bodies & Constraints --- 
    const wheelBodies: CANNON.Body[] = [];
    const wheelConstraints: CANNON.HingeConstraint[] = []; // Initialize constraints array
    // Pivot points relative to the chassis center (Use updated dimensions)
    const wheelPositions = [
        new CANNON.Vec3(-chassisWidth / 2, 0, chassisLength / 2 * 0.7), // Y=0 relative to chassis center
        new CANNON.Vec3( chassisWidth / 2, 0, chassisLength / 2 * 0.7), 
        new CANNON.Vec3(-chassisWidth / 2, 0, -chassisLength / 2 * 0.7), 
        new CANNON.Vec3( chassisWidth / 2, 0, -chassisLength / 2 * 0.7), 
    ];
    const wheelAxis = new CANNON.Vec3(1, 0, 0); // Hinge axis

    wheelPositions.forEach((pos, index) => {
        // Calculate world position for the wheel body relative to the CHASSIS initial position
        const wheelWorldPos = chassisBody.position.clone().vadd(pos); 
        // Set the wheel body's initial Y position explicitly based on radius
        // This ensures wheels start near the ground plane, even if chassis starts higher
        wheelWorldPos.y = wheelRadius; 

        const wheelBody = new CANNON.Body({
            mass: wheelMass,
            material: materials.wheelMaterial,
            shape: wheelShape, 
            position: wheelWorldPos,
            linearDamping: 0.3, // --- Added Linear Damping ---
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
        wheelConstraints.push(constraint); // Store the constraint
    });

    // No need to position carMesh here, it will be synced in main.ts

    const carPhysics: CarPhysics = {
        chassisBody,
        wheelBodies,
        wheelConstraints // Include constraints in the returned object
    };

    // Return the loaded mesh and the physics components
    return { mesh: carMesh, physics: carPhysics }; 
} 