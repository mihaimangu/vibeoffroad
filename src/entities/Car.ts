import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsMaterials } from '../core/physicsSetup';

export interface CarPhysics { // To return physics components
    chassisBody: CANNON.Body;
    wheelBodies: CANNON.Body[];
    // Constraints will be added later
}

export function createCar(world: CANNON.World, materials: PhysicsMaterials): {
    mesh: THREE.Group;
    physics: CarPhysics;
} {
    // Create a simple placeholder car
    const carGroup = new THREE.Group();

    // --- Dimensions and Materials (adjusted slightly for physics) ---
    const chassisWidth = 1.8;
    const chassisHeight = 0.7;
    const chassisLength = 4;
    const chassisMass = 150; // Approximate mass in kg

    const wheelRadius = 0.4;
    const wheelThickness = 0.3;
    const wheelMass = 10;

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x0055ff, flatShading: false });
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, flatShading: false });
    const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, flatShading: false });

    // --- Physics Shapes --- 
    // Box shape uses half-extents
    const chassisShape = new CANNON.Box(new CANNON.Vec3(chassisWidth / 2, chassisHeight / 2, chassisLength / 2));
    // Using Sphere for wheels is often simpler for basic physics/collisions
    const wheelShape = new CANNON.Sphere(wheelRadius); 

    // --- Chassis --- 
    // Create Mesh
    const bodyGeometry = new THREE.BoxGeometry(chassisWidth, chassisHeight, chassisLength); 
    const carBodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    const chassisYOffset = wheelRadius + chassisHeight / 2; // Position chassis relative to ground based on wheels
    carBodyMesh.position.y = chassisYOffset;
    carGroup.add(carBodyMesh);

    // Create Physics Body
    const chassisBody = new CANNON.Body({
        mass: chassisMass,
        material: materials.carMaterial,
        position: new CANNON.Vec3(0, chassisYOffset + 1.0, 0), // Start slightly above ground
        shape: chassisShape
    });
    // Rotate chassis body if needed (if Box direction differs from Mesh)
    world.addBody(chassisBody);

    // --- Cabin (visual only for now) --- 
    const cabinGeometry = new THREE.BoxGeometry(chassisWidth * 0.9, 0.8, chassisLength * 0.6);
    const carCabinMesh = new THREE.Mesh(cabinGeometry, cabinMaterial);
    carCabinMesh.position.set(0, carBodyMesh.position.y + chassisHeight / 2 + 0.8 / 2, -chassisLength * 0.1); 
    carGroup.add(carCabinMesh);

    // --- Wheels --- 
    const wheelMeshes: THREE.Group[] = [];
    const wheelBodies: CANNON.Body[] = [];
    const wheelPositions = [
        // Front Left 
        new CANNON.Vec3(-chassisWidth / 2 - wheelThickness / 2, 0, chassisLength / 2 * 0.7), // Pivot Y = 0 relative to chassis center 
        // Front Right
        new CANNON.Vec3( chassisWidth / 2 + wheelThickness / 2, 0, chassisLength / 2 * 0.7), 
        // Rear Left
        new CANNON.Vec3(-chassisWidth / 2 - wheelThickness / 2, 0, -chassisLength / 2 * 0.7), 
        // Rear Right
        new CANNON.Vec3( chassisWidth / 2 + wheelThickness / 2, 0, -chassisLength / 2 * 0.7), 
    ];

    // Create wheel materials once
    const tireMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x222222, // Dark grey/black tire
        roughness: 0.9, 
        metalness: 0.1 
    });
    const rimMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xaaaaaa, // Light grey rim
        roughness: 0.3, 
        metalness: 0.8 
    });

    // Create wheel geometries once
    const tireGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 24);
    tireGeometry.rotateX(Math.PI / 2); // Align with THREE Y-up convention
    const rimRadius = wheelRadius * 0.7;
    const rimThickness = wheelThickness * 1.1; // Slightly wider than tire
    const rimGeometry = new THREE.CylinderGeometry(rimRadius, rimRadius, rimThickness, 16);
    rimGeometry.rotateX(Math.PI / 2); 

    // Define the hinge axis (local X-axis for the wheels)
    const wheelAxis = new CANNON.Vec3(1, 0, 0);

    wheelPositions.forEach((pos, index) => {
        // --- Create Wheel Visual Group ---
        const wheelGroup = new THREE.Group();

        // Create Tire Mesh
        const tireMesh = new THREE.Mesh(tireGeometry, tireMaterial);
        // tireMesh.castShadow = true;
        // tireMesh.receiveShadow = true;
        wheelGroup.add(tireMesh);

        // Create Rim Mesh
        const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
        // rimMesh.castShadow = true;
        // rimMesh.receiveShadow = true;
        // Rim might need slight Z offset if thickness differs significantly, but should be centered otherwise
        wheelGroup.add(rimMesh); 

        // Position the visual wheel group relative to the carGroup origin
        wheelGroup.position.set(pos.x, pos.y + wheelRadius, pos.z); // Visual Y offset by radius
        wheelMeshes.push(wheelGroup); // Add the group
        carGroup.add(wheelGroup);
        // --- End of Wheel Visual Group ---

        // Calculate world position for the wheel body
        const wheelWorldPos = chassisBody.position.clone().vadd(pos); 
        wheelWorldPos.y = wheelRadius; // Ensure wheel body starts at correct height

        // Create Physics Body (still using Sphere shape)
        const wheelBody = new CANNON.Body({
            mass: wheelMass,
            material: materials.wheelMaterial,
            shape: wheelShape, 
            position: wheelWorldPos,
            angularDamping: 0.5 // Add some damping to prevent infinite spinning
        });
        world.addBody(wheelBody);
        wheelBodies.push(wheelBody);

        // Create Hinge Constraint (remains the same)
        const constraint = new CANNON.HingeConstraint(chassisBody, wheelBody, {
            pivotA: pos,                      
            pivotB: new CANNON.Vec3(0, 0, 0), 
            axisA: wheelAxis,                 
            axisB: wheelAxis                  
        });
        world.addConstraint(constraint);
    });

    // Position the entire car visual group (initial visual position)
    // This should align with the physics chassis initial position for consistency
    carGroup.position.copy(chassisBody.position as any);
    carGroup.position.y = 0; // Reset visual group Y pos, meshes are positioned relative to it
    carGroup.quaternion.copy(chassisBody.quaternion as any);

    // TODO: Replace with actual GLTF model loading
    // TODO: Add CANNON.RaycastVehicle or HingeConstraints for proper vehicle physics

    const carPhysics: CarPhysics = {
        chassisBody,
        wheelBodies
    };

    return { mesh: carGroup, physics: carPhysics };
} 