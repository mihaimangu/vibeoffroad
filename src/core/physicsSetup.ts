import * as CANNON from 'cannon-es';

// Define reusable materials
export const materials = {
    groundMaterial: new CANNON.Material("ground"),
    wheelMaterial: new CANNON.Material("wheel"),
    carMaterial: new CANNON.Material("car"),
    mudMaterial: new CANNON.Material("mud") // Add mud material
};

// Interface for physics materials (optional but good practice)
export interface PhysicsMaterials {
    groundMaterial: CANNON.Material;
    wheelMaterial: CANNON.Material;
    carMaterial: CANNON.Material;
    mudMaterial: CANNON.Material; // Add mud material
}

export function setupPhysicsWorld(): {
    world: CANNON.World;
    materials: PhysicsMaterials;
} {
    // Setup world
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Set gravity
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true; // Allow bodies to sleep for performance
    if (world.solver instanceof CANNON.GSSolver) {
        world.solver.iterations = 10;
    }

    // Define contact materials
    const groundWheelContactMaterial = new CANNON.ContactMaterial(
        materials.groundMaterial,
        materials.wheelMaterial,
        {
            friction: 0.7, // Normal ground friction
            restitution: 0.1, 
            contactEquationStiffness: 1e8,
            contactEquationRelaxation: 2,
            frictionEquationStiffness: 1e8,
            frictionEquationRelaxation: 2
        }
    );
    world.addContactMaterial(groundWheelContactMaterial);

    // --- Add Mud Contact Material --- 
    const mudWheelContactMaterial = new CANNON.ContactMaterial(
        materials.mudMaterial, 
        materials.wheelMaterial,
        {
            friction: 0.05, // <<< Very low friction for mud
            restitution: 0.1, // Low restitution (less bouncy)
            contactEquationStiffness: 1e7, // Maybe slightly softer contact?
            contactEquationRelaxation: 3,
            frictionEquationStiffness: 1e7, 
            frictionEquationRelaxation: 3
        }
    );
    world.addContactMaterial(mudWheelContactMaterial);

    // Contact between car chassis and ground (optional, adjust as needed)
    const carGroundContactMaterial = new CANNON.ContactMaterial(
        materials.groundMaterial,
        materials.carMaterial,
        { friction: 0.4, restitution: 0.1 }
    );
    world.addContactMaterial(carGroundContactMaterial);

    // Contact between car chassis and mud (optional)
    const carMudContactMaterial = new CANNON.ContactMaterial(
        materials.mudMaterial,
        materials.carMaterial,
        { friction: 0.1, restitution: 0.05 } // Low friction/restitution for chassis on mud
    );
    world.addContactMaterial(carMudContactMaterial);


    return { world, materials };
} 