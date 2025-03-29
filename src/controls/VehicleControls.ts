import * as CANNON from 'cannon-es';
import { CarPhysics, CarData } from '../entities/Car'; // Import the updated interface

// Interface to track the state of controls
interface ControlState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
}

export class VehicleControls {
    private carPhysics: CarPhysics;
    // Store reference to CarData to access lights
    private carData: CarData;
    private controlState: ControlState;
    private parkingBrakeEngaged: boolean = false; // State for parking brake
    private isBraking: boolean = false; // Track if normal brake is applied
    private maxForce: number = 2000; // *** Increased driving force significantly *** 
    private maxSteerValue: number = 0.5; // Max steering angle in radians (approx 30 degrees)
    private maxBrakeForce: number = 150; // Braking force
    private parkingBrakeLockForce: number = 10000; // Very strong force for parking brake
    private brakeLightIntensity: number = 2; // Match value from Car.ts
    private currentSteering: number = 0; // For smooth steering
    private steeringLerpFactor: number = 0.1; // How quickly the steering turns

    // References to the HTML elements
    private uiElements: {
        up: HTMLElement | null;
        down: HTMLElement | null;
        left: HTMLElement | null;
        right: HTMLElement | null;
        parkingBrake: HTMLElement | null; // Add parking brake element
    };

    constructor(carData: CarData) {
        this.carData = carData; // Store full CarData
        this.carPhysics = carData.physics; // Extract physics
        this.controlState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
        };
        // Find UI elements on creation
        this.uiElements = {
            up: document.getElementById('control-up'),
            down: document.getElementById('control-down'),
            left: document.getElementById('control-left'),
            right: document.getElementById('control-right'),
            parkingBrake: document.getElementById('parking-brake-button') // Find parking brake button
        };
        
        this.setupKeyboardListeners();
        this.updateUI(); // Initial UI state
    }

    private setupKeyboardListeners() {
        window.addEventListener('keydown', (event) => this.handleKey(event, true));
        window.addEventListener('keyup', (event) => this.handleKey(event, false));
        // Optional: Add keyboard shortcut for parking brake (e.g., 'P')
        window.addEventListener('keypress', (event) => {
             if (event.key.toUpperCase() === 'P') {
                 this.toggleParkingBrake();
             }
        });
    }

    private handleKey(event: KeyboardEvent, isKeyDown: boolean) {
        let stateChanged = false;

        switch (event.key.toUpperCase()) {
            case 'W':
            case 'ARROWUP':
                if (this.controlState.forward !== isKeyDown) {
                    this.controlState.forward = isKeyDown;
                    stateChanged = true;
                }
                break;
            case 'S':
            case 'ARROWDOWN':
                if (this.controlState.backward !== isKeyDown) {
                    this.controlState.backward = isKeyDown;
                    stateChanged = true;
                }
                break;
            case 'A':
            case 'ARROWLEFT':
                if (this.controlState.left !== isKeyDown) {
                    this.controlState.left = isKeyDown;
                    stateChanged = true;
                }
                break;
            case 'D':
            case 'ARROWRIGHT':
                if (this.controlState.right !== isKeyDown) {
                    this.controlState.right = isKeyDown;
                    stateChanged = true;
                }
                break;
        }

        // If the state changed, update the UI directly
        if (stateChanged) {
            this.updateUI();
        }
    }

    // New method to update UI element classes
    private updateUI(): void {
        if (this.uiElements.up) this.uiElements.up.classList.toggle('active', this.controlState.forward);
        if (this.uiElements.down) this.uiElements.down.classList.toggle('active', this.controlState.backward);
        if (this.uiElements.left) this.uiElements.left.classList.toggle('active', this.controlState.left);
        if (this.uiElements.right) this.uiElements.right.classList.toggle('active', this.controlState.right);
        // Update parking brake button style
        if (this.uiElements.parkingBrake) this.uiElements.parkingBrake.classList.toggle('active', this.parkingBrakeEngaged);
    }

    // Method to toggle the parking brake state
    public toggleParkingBrake(): void {
        this.parkingBrakeEngaged = !this.parkingBrakeEngaged;
        console.log("Parking Brake:", this.parkingBrakeEngaged ? "ON" : "OFF");
        this.updateUI(); // Update button appearance
        // Immediately apply/release brake in physics if toggled
        this.applyParkingBrakePhysics(); 
    }

    // New method to apply/release parking brake in physics
    private applyParkingBrakePhysics(): void {
        if (!this.carPhysics?.vehicle) return;
        const vehicle = this.carPhysics.vehicle;
        const brakeForceToApply = this.parkingBrakeEngaged ? this.parkingBrakeLockForce : 0;

        vehicle.setBrake(brakeForceToApply, 0);
        vehicle.setBrake(brakeForceToApply, 1);
        vehicle.setBrake(brakeForceToApply, 2);
        vehicle.setBrake(brakeForceToApply, 3);
    }

    public update(deltaTime: number): void {
        // Check physics and vehicle at start of update
        if (!this.carPhysics?.vehicle) {
            console.error("[VehicleControls.ts] Update called but this.carPhysics.vehicle is missing!");
            return; 
        }
        const vehicle = this.carPhysics.vehicle;

        // --- Apply/Check Parking Brake FIRST --- 
        this.applyParkingBrakePhysics();
        if (this.parkingBrakeEngaged) {
            this.setBrakeLightState(true); // Turn lights ON for parking brake
            return; // Stop further processing
        }

        // --- Steering (Only if parking brake is OFF) --- 
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

        // --- Acceleration / Normal Braking (Only if parking brake is OFF) --- 
        let engineForce = 0;
        let brakeForce = 0; // Normal braking force
        this.isBraking = false; // Reset braking state for this frame

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
             this.isBraking = true; // Set braking state
        } else if (!this.controlState.forward && !this.controlState.backward) {
             // Optional: Apply slight brake when coasting to simulate drag
             // brakeForce = 5;
        }

        // Apply brake force to all wheels
        vehicle.setBrake(brakeForce, 0);
        vehicle.setBrake(brakeForce, 1);
        vehicle.setBrake(brakeForce, 2);
        vehicle.setBrake(brakeForce, 3);

        // --- Update Brake Lights --- 
        // Turn lights ON if normal braking OR parking brake is on (handled earlier)
        this.setBrakeLightState(this.isBraking);
    }

    // Helper method to turn brake lights on/off
    private setBrakeLightState(isOn: boolean): void {
        const intensity = isOn ? this.brakeLightIntensity : 0;
        if (this.carData.brakeLights) {
            if (this.carData.brakeLights.left) this.carData.brakeLights.left.intensity = intensity;
            if (this.carData.brakeLights.right) this.carData.brakeLights.right.intensity = intensity;
        }
    }
} 