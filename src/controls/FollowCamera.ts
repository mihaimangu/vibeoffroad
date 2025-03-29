import * as THREE from 'three';

export class FollowCamera {
    private camera: THREE.PerspectiveCamera;
    private target: THREE.Object3D;

    // Camera positioning parameters
    private distance = 10.0; // Distance behind the target
    private height = 5.0;   // Height above the target
    private lookAtOffset = new THREE.Vector3(0, 1.0, 0); // Point slightly above the target's base to look at
    private smoothness = 0.05; // Camera lerp smoothness (lower = smoother/slower)

    private currentPosition: THREE.Vector3;
    private currentLookat: THREE.Vector3;

    constructor(camera: THREE.PerspectiveCamera, target: THREE.Object3D) {
        this.camera = camera;
        this.target = target;
        this.currentPosition = new THREE.Vector3();
        this.currentLookat = new THREE.Vector3();

        // Initialize camera position roughly
        const initialOffset = new THREE.Vector3(0, this.height, this.distance);
        this.camera.position.copy(this.target.position).add(initialOffset);
        this.camera.lookAt(this.target.position.clone().add(this.lookAtOffset));

        this.currentPosition.copy(this.camera.position);
        this.currentLookat.copy(this.target.position).add(this.lookAtOffset);

        console.log("FollowCamera initialized.");
    }

    public update(deltaTime: number) {
        if (!this.target) return;

        // 1. Calculate desired camera position
        // Get the target's forward direction (local Z axis transformed to world)
        const targetDirection = new THREE.Vector3();
        this.target.getWorldDirection(targetDirection);
        // Negate it to get the direction behind the target
        const backwardDirection = targetDirection.negate();

        // Calculate desired position: target position + backward offset + height offset
        const desiredPosition = this.target.position.clone()
            .add(backwardDirection.multiplyScalar(this.distance))
            .add(new THREE.Vector3(0, this.height, 0));

        // 2. Calculate desired lookAt point
        const desiredLookat = this.target.position.clone().add(this.lookAtOffset);

        // 3. Smoothly interpolate (Lerp) current position and lookAt towards desired points
        // Adjust interpolation factor based on deltaTime for frame rate independence (optional but good)
        const lerpFactor = 1.0 - Math.exp(-this.smoothness * 60 * deltaTime); // Approximation for frame rate independence

        this.currentPosition.lerp(desiredPosition, lerpFactor);
        this.currentLookat.lerp(desiredLookat, lerpFactor);

        // 4. Apply the interpolated position and lookAt to the camera
        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookat);
    }
} 