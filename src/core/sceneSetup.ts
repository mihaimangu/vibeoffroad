import * as THREE from 'three';

export function setupScene() {
    // Basic Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10); // Initial camera position

    const renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
        antialias: true // Enable antialiasing for smoother edges
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Enable shadow mapping in the renderer
    // renderer.shadowMap.enabled = true;
    // renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

    document.body.appendChild(renderer.domElement);

    // Add Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Adjusted intensity
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); // Adjusted intensity
    directionalLight.position.set(10, 15, 10); // Adjusted position
    // Enable shadows for the directional light
    // directionalLight.castShadow = true;
    // Configure shadow properties (optional, but good for quality)
    // directionalLight.shadow.mapSize.width = 2048;
    // directionalLight.shadow.mapSize.height = 2048;
    // directionalLight.shadow.camera.near = 0.5;
    // directionalLight.shadow.camera.far = 50;
    // directionalLight.shadow.camera.left = -20;
    // directionalLight.shadow.camera.right = 20;
    // directionalLight.shadow.camera.top = 20;
    // directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);
    // Optional: Add a helper to visualize the light's direction and shadow camera
    // const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 5);
    // scene.add(lightHelper);
    // const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // scene.add(shadowHelper);


    // Handle window resizing
    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Initial lookAt after camera is positioned
    camera.lookAt(scene.position);

    return { scene, camera, renderer, ambientLight, directionalLight, handleResize };
} 