import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsMaterials } from '../core/physicsSetup';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Updated Physics interface
export interface CarPhysics {
    chassisBody: CANNON.Body;
    vehicle: CANNON.RaycastVehicle;
}

// Updated return type to include brake lights
export interface CarData {
    mesh: THREE.Group;
    physics: CarPhysics;
    visualWheels: {
        frontLeft: THREE.Object3D | undefined;
        frontRight: THREE.Object3D | undefined;
        rearLeft: THREE.Object3D | undefined;
        rearRight: THREE.Object3D | undefined;
    };
    brakeLights: {
        left: THREE.PointLight;
        right: THREE.PointLight;
    }
}

export async function createCar(world: CANNON.World, materials: PhysicsMaterials): Promise<CarData> {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync('/models/car.glb');
    const carMesh = gltf.scene;

    // --- Find Visual Wheel Nodes using correct names from image --- 
    const visualWheels = {
        frontLeft: carMesh.getObjectByName('wheel_fl'),
        frontRight: carMesh.getObjectByName('wheel_fr'),
        rearLeft: carMesh.getObjectByName('wheel_bl'),
        rearRight: carMesh.getObjectByName('wheel_br')
    };
    console.log("Found visual wheels in original car.glb:", visualWheels);
    

    // --- Physics Setup (Reverted to likely original scale values) --- 
    // Use dimensions suitable for the original model
    const chassisWidth = 1.8; 
    const chassisHeight = 0.5; // Might need adjustment based on visual model
    const chassisLength = 4.0; 
    const chassisMass = 600; // Revert to a potentially higher mass 
    const chassisShape = new CANNON.Box(new CANNON.Vec3(chassisWidth / 2, chassisHeight / 2, chassisLength / 2));
    
    // Calculate initial position based on original dimensions
    const wheelRadius = 0.35; // Revert to original estimate
    const initialChassisY = wheelRadius; // Start with chassis bottom near wheel bottom

    const chassisBody = new CANNON.Body({ 
        mass: chassisMass,
        material: materials.carMaterial, 
        shape: chassisShape,
        position: new CANNON.Vec3(0, initialChassisY, 0), 
        angularDamping: 0.5
     });
    world.addBody(chassisBody);

    // --- Raycast Vehicle Setup --- 
    const vehicle = new CANNON.RaycastVehicle({
        chassisBody: chassisBody,
        indexUpAxis: 1, 
        indexForwardAxis: 2,
        indexRightAxis: 0
    });

    // --- Wheel Info Configuration (Reverted to likely original scale) --- 
    const wheelMaterial = materials.wheelMaterial; 
    const suspensionStiffness = 35; // Revert stiffness
    const suspensionRestLength = 0.3; // Revert rest length
    const suspensionDamping = 4; // Revert damping
    const maxSuspensionTravel = 0.2; // Revert travel
    const frictionSlip = 1.5; 
    const rollInfluence = 0.05; 

    const wheelOptions = {
        radius: wheelRadius, // Use original radius
        material: wheelMaterial,
        directionLocal: new CANNON.Vec3(0, -1, 0), 
        suspensionStiffness: suspensionStiffness,
        suspensionRestLength: suspensionRestLength,
        frictionSlip: frictionSlip,
        dampingRelaxation: suspensionDamping, 
        dampingCompression: suspensionDamping * 0.7, 
        maxSuspensionForce: 100000, 
        rollInfluence: rollInfluence,
        axleLocal: new CANNON.Vec3(-1, 0, 0), 
        chassisConnectionPointLocal: new CANNON.Vec3(),
        isFrontWheel: false,
        maxSuspensionTravel: maxSuspensionTravel,
        customSlidingRotationalSpeed: -30,
        useCustomfrictionRotation: true
    };

    // Define wheel connection points using original chassis dimensions
    const connectionPointZ = chassisLength * 0.38; // Adjust multiplier if needed
    const connectionPointX = chassisWidth * 0.45; // Adjust multiplier if needed
    const connectionPointY = -chassisHeight * 0.3; // Adjust multiplier if needed

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

    // --- Brake Lights Setup --- 
    const brakeLightIntensity = 2; // Adjust intensity
    const brakeLightDistance = 5;  // Adjust how far the light reaches
    const brakeLightColor = 0xff0000; // Red

    const brakeLightL = new THREE.PointLight(brakeLightColor, 0, brakeLightDistance); // Start OFF (intensity 0)
    brakeLightL.castShadow = false; // Optional: disable shadows for performance
    // Position guesses (relative to car center) - Adjust these!
    // X: negative for left, Y: height, Z: negative for rear
    brakeLightL.position.set(-chassisWidth * 0.4, chassisHeight * 0.4, -chassisLength * 0.5);
    carMesh.add(brakeLightL); // Add light as child of car mesh

    const brakeLightR = new THREE.PointLight(brakeLightColor, 0, brakeLightDistance); // Start OFF
    brakeLightR.castShadow = false;
    // Position guesses (relative to car center)
    // X: positive for right, Y: height, Z: negative for rear
    brakeLightR.position.set(chassisWidth * 0.4, chassisHeight * 0.4, -chassisLength * 0.5);
    carMesh.add(brakeLightR);

    // Store lights for later control
    const brakeLights = { left: brakeLightL, right: brakeLightR };

    // Store physics components
    const carPhysics: CarPhysics = {
        chassisBody,
        vehicle
    };

    // Return all data
    return {
        mesh: carMesh,
        physics: carPhysics,
        visualWheels,
        brakeLights
    };
} 