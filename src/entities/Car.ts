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
    const wheelMeshes: THREE.Mesh[] = [];
    const wheelBodies: CANNON.Body[] = [];
    const wheelPositions = [
        // Front Left 
        new CANNON.Vec3(-chassisWidth / 2 - wheelThickness / 2, wheelRadius, chassisLength / 2 * 0.7), 
        // Front Right
        new CANNON.Vec3( chassisWidth / 2 + wheelThickness / 2, wheelRadius, chassisLength / 2 * 0.7), 
        // Rear Left
        new CANNON.Vec3(-chassisWidth / 2 - wheelThickness / 2, wheelRadius, -chassisLength / 2 * 0.7), 
        // Rear Right
        new CANNON.Vec3( chassisWidth / 2 + wheelThickness / 2, wheelRadius, -chassisLength / 2 * 0.7), 
    ];

    // Create wheel mesh geometry once
    const wheelMeshGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 18);
    wheelMeshGeometry.rotateZ(Math.PI / 2); // Align with Cannon sphere/cylinder orientation

    wheelPositions.forEach((pos, index) => {
        // Create Mesh
        const wheelMesh = new THREE.Mesh(wheelMeshGeometry, wheelMaterial);
        // Position mesh visually relative to the carGroup origin
        wheelMesh.position.set(pos.x, pos.y, pos.z);
        // wheelMesh.castShadow = true;
        wheelMeshes.push(wheelMesh);
        carGroup.add(wheelMesh);

        // Create Physics Body
        const wheelBody = new CANNON.Body({
            mass: wheelMass,
            material: materials.wheelMaterial,
            shape: wheelShape, 
             // Position physics body in world space (relative to chassis body's initial position)
            position: chassisBody.position.clone().vadd(pos) 
        });
        // Initial orientation for wheels (important for hinge constraints later)
        wheelBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
        world.addBody(wheelBody);
        wheelBodies.push(wheelBody);
    });

    // Position the entire car visual group (initial visual position)
    // This might not perfectly match physics start if chassisBody starts higher
    carGroup.position.y = 0; 

    // TODO: Replace with actual GLTF model loading
    // TODO: Add CANNON.RaycastVehicle or HingeConstraints for proper vehicle physics

    const carPhysics: CarPhysics = {
        chassisBody,
        wheelBodies
    };

    return { mesh: carGroup, physics: carPhysics };
} 