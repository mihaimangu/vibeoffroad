import * as CANNON from 'cannon-es';

export interface PhysicsMaterials {
    groundMaterial: CANNON.Material;
    carMaterial: CANNON.Material;
    wheelMaterial: CANNON.Material;
    fenceMaterial: CANNON.Material;
    // Add other materials as needed
}

export function setupPhysicsWorld(): { world: CANNON.World, materials: PhysicsMaterials } {
    // Create the physics world
    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0); // Set standard gravity (meters per second squared)
    world.broadphase = new CANNON.SAPBroadphase(world); // More efficient broadphase for larger scenes
    world.allowSleep = true; // Allow objects to sleep when not moving to save performance

    // Create materials
    const groundMaterial = new CANNON.Material("groundMaterial");
    const carMaterial = new CANNON.Material("carMaterial");
    const wheelMaterial = new CANNON.Material("wheelMaterial");
    const fenceMaterial = new CANNON.Material("fenceMaterial");

    const materials: PhysicsMaterials = {
        groundMaterial,
        carMaterial,
        wheelMaterial,
        fenceMaterial
    };

    // Define contact materials (friction, restitution)
    const groundCarContactMaterial = new CANNON.ContactMaterial(
        groundMaterial,
        carMaterial,
        {
            friction: 0.4,      // Friction between ground and car body
            restitution: 0.1    // Bounciness
        }
    );
    world.addContactMaterial(groundCarContactMaterial);

    const groundWheelContactMaterial = new CANNON.ContactMaterial(
        groundMaterial,
        wheelMaterial,
        {
            friction: 0.7, // Increased friction slightly again
            restitution: 0.1,
            contactEquationStiffness: 1e8, // Keep stiff
            contactEquationRelaxation: 2, // Allow a little relaxation (default 3)
            frictionEquationStiffness: 1e8, // Keep stiff
            frictionEquationRelaxation: 2 // Allow a little relaxation (default 3)
        }
    );
    world.addContactMaterial(groundWheelContactMaterial);

    const groundFenceContactMaterial = new CANNON.ContactMaterial(
        groundMaterial,
        fenceMaterial,
        {
            friction: 0.2,
            restitution: 0.5
        }
    );
    world.addContactMaterial(groundFenceContactMaterial);
    
    const carFenceContactMaterial = new CANNON.ContactMaterial(
        carMaterial,
        fenceMaterial,
        {
            friction: 0.1,
            restitution: 0.2
        }
    );
    world.addContactMaterial(carFenceContactMaterial);

    // Add more contact materials as needed (e.g., wheel-fence)

    console.log("Cannon.js physics world initialized.");
    return { world, materials };
} 