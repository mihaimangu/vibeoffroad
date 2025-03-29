import * as CANNON from 'cannon-es';
import { CarPhysics } from '../entities/Car'; // Import the updated interface

// Interface to track the state of controls
interface ControlState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
}

export class VehicleControls {
    private carPhysics: CarPhysics;
    private controlState: ControlState;
    private maxForce: number = 2000; // *** Increased driving force significantly *** 
    private maxSteerValue: number = 0.5; // Max steering angle in radians (approx 30 degrees)
    private maxBrakeForce: number = 50; // Braking force
    private currentSteering: number = 0; // For smooth steering
    private steeringLerpFactor: number = 0.1; // How quickly the steering turns

    constructor(carPhysics: CarPhysics) {
        this.carPhysics = carPhysics; // Store the physics object containing the vehicle
        this.controlState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
        };

        this.setupKeyboardListeners();
    }

    private setupKeyboardListeners() {
        window.addEventListener('keydown', (event) => this.handleKey(event, true));
        window.addEventListener('keyup', (event) => this.handleKey(event, false));
    }

    private handleKey(event: KeyboardEvent, isKeyDown: boolean) {
        switch (event.key.toUpperCase()) {
            case 'W':
            case 'ARROWUP':
                this.controlState.forward = isKeyDown;
                break;
            case 'S':
            case 'ARROWDOWN':
                this.controlState.backward = isKeyDown;
                break;
            case 'A':
            case 'ARROWLEFT':
                this.controlState.left = isKeyDown;
                break;
            case 'D':
            case 'ARROWRIGHT':
                this.controlState.right = isKeyDown;
                break;
        }
    }

    public update(deltaTime: number): void {
        const vehicle = this.carPhysics.vehicle;

        // --- Steering --- 
        let targetSteering = 0;
        if (this.controlState.left) {
            targetSteering = this.maxSteerValue;
        } else if (this.controlState.right) {
            targetSteering = -this.maxSteerValue;
        }
        // Smoothly interpolate steering
        this.currentSteering += (targetSteering - this.currentSteering) * this.steeringLerpFactor * (deltaTime * 60); // Adjust lerp based on frame rate
        vehicle.setSteeringValue(this.currentSteering, 0); // Front left wheel (index 0)
        vehicle.setSteeringValue(this.currentSteering, 1); // Front right wheel (index 1)

        // --- Acceleration / Braking --- 
        let engineForce = 0;
        let brakeForce = 0;

        if (this.controlState.forward) {
            engineForce = -this.maxForce; // *** Inverted sign for forward motion ***
        } else if (this.controlState.backward) {
            // Option 1: Apply brake force when moving backward key is pressed
            // brakeForce = this.maxBrakeForce;
            // Option 2: Drive in reverse
            engineForce = this.maxForce * 0.5; // *** Inverted sign for reverse motion (now positive) ***
        }

        // Apply engine force to rear wheels (indices 2 and 3)
        vehicle.applyEngineForce(engineForce, 2); 
        vehicle.applyEngineForce(engineForce, 3);

        // Apply braking force (can be applied to all wheels or selectively)
        // Example: Apply brake if 'S' is pressed and moving forward, or if no acceleration input
        const forwardVelocity = vehicle.chassisBody.velocity.dot(vehicle.chassisBody.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1)));
        if (this.controlState.backward && forwardVelocity > 0.1) { // Brake if pressing S while moving forward
             brakeForce = this.maxBrakeForce;
        } else if (!this.controlState.forward && !this.controlState.backward) {
             // Optional: Apply slight brake when coasting to simulate drag
             // brakeForce = 5;
        }

        // Apply brake force to all wheels
        vehicle.setBrake(brakeForce, 0);
        vehicle.setBrake(brakeForce, 1);
        vehicle.setBrake(brakeForce, 2);
        vehicle.setBrake(brakeForce, 3);

        // --- (Old Hinge Constraint Logic - REMOVED) ---
        // let force = 0;
        // if (this.controlState.forward) {
        //     force = -this.maxForce; // Apply force to rotate wheels forward (adjust sign if needed)
        // }
        // if (this.controlState.backward) {
        //     force = this.maxForce; // Apply force to rotate wheels backward
        // }

        // // Example: Apply drive torque only to rear wheels (assuming indices 2 and 3)
        // if (this.carPhysics.wheelConstraints.length > 3) {
        //     this.carPhysics.wheelConstraints[2].enableMotor();
        //     this.carPhysics.wheelConstraints[2].setMotorSpeed(force * (deltaTime * 60)); // Adjust speed based on framerate
        //     this.carPhysics.wheelConstraints[2].setMotorMaxForce(Math.abs(force) > 0 ? this.maxForce : 0);

        //     this.carPhysics.wheelConstraints[3].enableMotor();
        //     this.carPhysics.wheelConstraints[3].setMotorSpeed(force * (deltaTime * 60));
        //     this.carPhysics.wheelConstraints[3].setMotorMaxForce(Math.abs(force) > 0 ? this.maxForce : 0);
        // } else {
        //     console.warn("Not enough wheel constraints found for driving.");
        // }

        // // Basic Steering (applying torque to chassis - now handled by RaycastVehicle)
        // let torque = 0;
        // const steerStrength = 250; // Adjust as needed
        // if (this.controlState.left) {
        //     torque = steerStrength;
        // }
        // if (this.controlState.right) {
        //     torque = -steerStrength;
        // }
        // // Apply torque around the world's Y-axis (or chassis's local Y)
        // this.carPhysics.chassisBody.torque.y += torque * deltaTime;

    }
} 