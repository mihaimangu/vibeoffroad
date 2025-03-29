import * as CANNON from 'cannon-es';
import { CarPhysics } from '../entities/Car'; // Assuming CarPhysics includes constraints now

interface ControlState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
}

export class VehicleControls {
    private controls: ControlState;
    private carPhysics: CarPhysics | null = null;

    // Control parameters
    private maxSteerVal = 0.5; // Radians for max steering angle
    private maxForce = 250; // --- Reduced force to a more moderate level ---
    private brakeForce = 20; // Force applied for braking

    constructor() {
        this.controls = { forward: false, backward: false, left: false, right: false };
        this._setupKeyboardListeners();
    }

    public connect(carPhysics: CarPhysics) {
        this.carPhysics = carPhysics;
    }

    private _setupKeyboardListeners() {
        window.addEventListener('keydown', (event) => this._handleKey(event, true));
        window.addEventListener('keyup', (event) => this._handleKey(event, false));
    }

    private _handleKey(event: KeyboardEvent, isDown: boolean) {
        switch (event.key.toUpperCase()) {
            case 'W':
            case 'ARROWUP':
                this.controls.forward = isDown;
                break;
            case 'S':
            case 'ARROWDOWN':
                this.controls.backward = isDown;
                break;
            case 'A':
            case 'ARROWLEFT':
                this.controls.left = isDown;
                break;
            case 'D':
            case 'ARROWRIGHT':
                this.controls.right = isDown;
                break;
            // Add brake key (e.g., Space) if desired
        }
    }

    public update(deltaTime: number) {
        if (!this.carPhysics) return;

        const { chassisBody, wheelBodies, wheelConstraints } = this.carPhysics;
        if (!wheelConstraints || wheelConstraints.length < 4) return; // Ensure constraints exist

        // --- Acceleration / Braking --- 
        let motorSpeed = 0;
        let driving = false;

        if (this.controls.forward) {
            motorSpeed = -this.maxForce; // Negative force for forward rotation around X axis
            driving = true;
        }
        if (this.controls.backward) {
            motorSpeed = this.maxForce; 
            driving = true;
        }

        // Apply torque to rear wheels (indices 2 and 3)
        wheelConstraints[2].enableMotor();
        wheelConstraints[3].enableMotor();
        wheelConstraints[2].setMotorSpeed(motorSpeed);
        wheelConstraints[3].setMotorSpeed(motorSpeed);
        
        // Apply brake force if not accelerating/reversing but key is pressed, or implement separate brake
        if (!driving) {
            // Simple braking by stopping motor (or apply opposing force)
             wheelConstraints[2].disableMotor();
             wheelConstraints[3].disableMotor();
             // Optional: Apply braking force directly to wheels if needed
             // wheelBodies[2].applyLocalForce(new CANNON.Vec3(0,0,brakeForce), CANNON.Vec3.ZERO);
        } else {
            // Need to set max force for the motor
            // Note: Cannon-es might handle max force differently or within enableMotor
            // This part might need adjustment based on cannon-es version/behavior
        }

        // --- Steering --- 
        let steerValue = 0;
        if (this.controls.left) {
            steerValue = this.maxSteerVal;
        }
        if (this.controls.right) {
            steerValue = -this.maxSteerVal;
        }

        // Adjust front wheel constraints (indices 0 and 1)
        // IMPORTANT: Modifying constraints directly like this is rudimentary.
        // It changes the hinge axis in the *chassis* local space.
        // A proper RaycastVehicle is much better for steering.
        const steerAxisA_Left = new CANNON.Vec3(Math.cos(steerValue), 0, Math.sin(steerValue));
        const steerAxisA_Right = new CANNON.Vec3(Math.cos(steerValue), 0, Math.sin(steerValue));
        
        // We need to be careful modifying axisA directly. Let's try updating the constraint configuration.
        // This might not be directly supported or might require recreating the constraint.
        // Let's just *log* the intent for now, as direct HingeConstraint steering is tricky.
        if (steerValue !== 0) {
            // console.log(`Steering intent: ${steerValue > 0 ? 'Left' : 'Right'}`);
            // Attempting direct axis modification (EXPERIMENTAL - MAY NOT WORK WELL)
            // wheelConstraints[0].axisA.copy(steerAxisA_Left);
            // wheelConstraints[1].axisA.copy(steerAxisA_Right);
            // A better approach might involve applying torque to the chassis based on steering input
            // Or using RaycastVehicle
            const steerTorque = steerValue * 50; // Apply torque around Y axis for steering effect
            chassisBody.torque.y = steerTorque; 

        } else {
            chassisBody.torque.y = 0; // Reset steering torque
        }

        // Ensure angular velocity doesn't get out of control when steering
        // chassisBody.angularVelocity.y *= 0.95; // Apply some damping
    }
} 