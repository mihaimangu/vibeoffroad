import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsMaterials } from '../core/physicsSetup';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Updated Physics interface
export interface CarPhysics {
    chassisBody: CANNON.Body;
    vehicle: CANNON.RaycastVehicle;
}

// Updated return type to potentially include named visual wheel nodes
export interface CarData {
    mesh: THREE.Group;
    physics: CarPhysics;
    visualWheels: {
        frontLeft: THREE.Object3D | undefined;
        frontRight: THREE.Object3D | undefined;
        rearLeft: THREE.Object3D | undefined;
        rearRight: THREE.Object3D | undefined;
    };
}

export async function createCar(world: CANNON.World, materials: PhysicsMaterials): Promise<CarData> {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('/models/car.glb');
    const carMesh = gltf.scene;

    // --- Find Visual Wheel Nodes (ASSUMES NAMING CONVENTION) ---
    // IMPORTANT: You might need to adjust these names based on how the GLB was exported from Blender.
    // Check the object names in Blender's outliner before exporting.
    const visualWheels = {
        frontLeft: carMesh.getObjectByName('Wheel_Front_Left'),
        frontRight: carMesh.getObjectByName('Wheel_Front_Right'),
        rearLeft: carMesh.getObjectByName('Wheel_Rear_Left'),
        rearRight: carMesh.getObjectByName('Wheel_Rear_Right')
    };
    console.log("Found visual wheels:", visualWheels);
    // If names aren't found, the wheels won't sync visually.

    carMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            // child.castShadow = true;
            // child.receiveShadow = true;
        }
    });

    // --- Physics Setup --- 
    const chassisWidth = 1.8;
    const chassisHeight = 0.2; // Keep thin shape for clearance
    const chassisLength = 4.0;
    const chassisMass = 600; // Adjusted mass
    const chassisShape = new CANNON.Box(new CANNON.Vec3(chassisWidth / 2, chassisHeight / 2, chassisLength / 2));
    const chassisBody = new CANNON.Body({ 
        mass: chassisMass,
        material: materials.carMaterial, // Use a dedicated material if needed
        shape: chassisShape,
        position: new CANNON.Vec3(0, 1.5, 0), // Start reasonably high
        angularDamping: 0.5
     });
    world.addBody(chassisBody);

    // --- Raycast Vehicle Setup --- 
    const vehicle = new CANNON.RaycastVehicle({
        chassisBody: chassisBody,
        indexUpAxis: 1, // 0=x, 1=y, 2=z
        indexForwardAxis: 2,
        indexRightAxis: 0
    });

    // --- Wheel Info Configuration --- 
    const wheelRadius = 0.35;
    const wheelMaterial = materials.wheelMaterial; // Use the defined wheel material
    const suspensionStiffness = 35;
    const suspensionRestLength = 0.4;
    const suspensionDamping = 4; // Combined damping
    const maxSuspensionTravel = 0.2;
    const frictionSlip = 1.5;
    const rollInfluence = 0.05;

    const wheelOptions = {
        radius: wheelRadius,
        material: wheelMaterial,
        directionLocal: new CANNON.Vec3(0, -1, 0), // Suspension direction (down)
        suspensionStiffness: suspensionStiffness,
        suspensionRestLength: suspensionRestLength,
        frictionSlip: frictionSlip,
        dampingRelaxation: suspensionDamping, 
        dampingCompression: suspensionDamping * 0.7, 
        maxSuspensionForce: 100000,
        rollInfluence: rollInfluence,
        axleLocal: new CANNON.Vec3(-1, 0, 0), // Wheel rotation axis (corrected: should be local X for side wheels)
        chassisConnectionPointLocal: new CANNON.Vec3(), // To be set per wheel
        isFrontWheel: false, // To be set per wheel
        maxSuspensionTravel: maxSuspensionTravel,
        customSlidingRotationalSpeed: -30,
        useCustomfrictionRotation: true
    };

    // Define wheel connection points (relative to chassis center)
    const connectionPointZ = chassisLength * 0.35; // How far front/back
    const connectionPointX = chassisWidth * 0.5 + 0.05; // How far side to side
    const connectionPointY = -chassisHeight * 0.5 + 0.1; // Vertical connection offset

    // Front Left
    wheelOptions.isFrontWheel = true;
    wheelOptions.chassisConnectionPointLocal.set(connectionPointX, connectionPointY, connectionPointZ);
    vehicle.addWheel(wheelOptions);

    // Front Right
    wheelOptions.isFrontWheel = true;
    wheelOptions.chassisConnectionPointLocal.set(-connectionPointX, connectionPointY, connectionPointZ);
    vehicle.addWheel(wheelOptions);

    // Rear Left
    wheelOptions.isFrontWheel = false;
    wheelOptions.chassisConnectionPointLocal.set(connectionPointX, connectionPointY, -connectionPointZ);
    vehicle.addWheel(wheelOptions);

    // Rear Right
    wheelOptions.isFrontWheel = false;
    wheelOptions.chassisConnectionPointLocal.set(-connectionPointX, connectionPointY, -connectionPointZ);
    vehicle.addWheel(wheelOptions);

    vehicle.addToWorld(world);

    // Store physics components
    const carPhysics: CarPhysics = {
        chassisBody,
        vehicle
    };

    // Return all data
    return {
        mesh: carMesh,
        physics: carPhysics,
        visualWheels
    };
} 