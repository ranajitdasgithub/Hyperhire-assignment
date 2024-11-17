import * as THREE from "../node_modules/three/build/three.module.js";
import { OrbitControls } from "../node_modules/three/examples/jsm/controls/OrbitControls.js";
import earthTexturePath from "../public/earthmap_clouds.jpeg";

// Global variables
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const controls = new OrbitControls(camera, renderer.domElement);
const textureLoader = new THREE.TextureLoader();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredMarker = null;

let airplane;
let curve;
let flightProgress = 0;
const radius = 6;
const flightSpeed = 0.002;
const earthTexture = textureLoader.load(earthTexturePath);

initializeScene();
createAirplane();
animate();

function initializeScene() {
  setupRenderer();
  setupCamera();
  createEarth();
  createMarkers();
  createCurve();

  window.addEventListener("resize", onResize);
  window.addEventListener("mousemove", onMouseMove);
}

function setupRenderer() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
}

function setupCamera() {
  const latitude = 20; // India's central latitude
  const longitude = 80; // India's central longitude

  const phi = (90 - latitude) * (Math.PI / 180);
  const theta = (longitude + 180) * (Math.PI / 180);

  const distance = 15;
  camera.position.x = distance * Math.sin(phi) * Math.cos(theta);
  camera.position.y = distance * Math.cos(phi);
  camera.position.z = distance * Math.sin(phi) * Math.sin(theta);

  camera.lookAt(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
}

function createEarth() {
  const geometry = new THREE.SphereGeometry(radius, 64, 64);
  const material = new THREE.MeshBasicMaterial({ map: earthTexture });
  const earth = new THREE.Mesh(geometry, material);
  scene.add(earth);
}

function createMarkers() {
  const startLat = 28.6139, // Delhi
    startLon = 77.209;
  const endLat = 12.9716, // Bengaluru
    endLon = 77.5946;

  createMarkerWithSphere(startLat, startLon, 0xff0000, "Delhi");
  createMarkerWithSphere(endLat, endLon, 0x0000ff, "Bengaluru");
}

function createMarkerWithSphere(lat, lon, color, name) {
  // Create the pulsing circle
  const innerRadius = 0.08;
  const outerRadius = 0.1;
  const circleGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 32);
  const circleMaterial = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
  });

  const circle = new THREE.Mesh(circleGeometry, circleMaterial);
  circle.position.copy(latLongToVector3(lat, lon, radius + 0.01));
  circle.lookAt(0, 0, 0);

  circle.userData = {
    pulsing: true,
    originalColor: color,
    name,
  };

  scene.add(circle);

  // Create the green sphere marker
  const sphereGeometry = new THREE.SphereGeometry(0.05, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphere.position.copy(latLongToVector3(lat, lon, radius + 0.02));

  sphere.userData = {
    marker: true,
    originalColor: 0x00ff00,
    name,
  };

  scene.add(sphere);
}

function createCurve() {
  const startLat = 28.6139,
    startLon = 77.209;
  const endLat = 12.9716,
    endLon = 77.5946;

  curve = createCurveBetweenPoints(
    startLat,
    startLon,
    endLat,
    endLon,
    radius,
    1
  );
}

function createCurveBetweenPoints(lat1, lon1, lat2, lon2, globeRadius, height) {
  const start = latLongToVector3(lat1, lon1, globeRadius);
  const end = latLongToVector3(lat2, lon2, globeRadius);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mid.normalize().multiplyScalar(globeRadius + height);

  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.01, 8, false);
  const tubeMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
  scene.add(tube);

  return curve;
}

function latLongToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function createAirplane() {
  const geometry = new THREE.SphereGeometry(0.1, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  airplane = new THREE.Mesh(geometry, material);

  const start = latLongToVector3(28.6139, 77.209, radius);
  airplane.position.copy(start);
  scene.add(airplane);
}

function animate() {
  requestAnimationFrame(animate);

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  let foundMarker = null;
  for (const intersect of intersects) {
    if (intersect.object.userData.marker) {
      foundMarker = intersect.object;
      break;
    }
  }

  // Highlight or reset marker appearance based on hover
  if (foundMarker) {
    if (hoveredMarker !== foundMarker) {
      if (hoveredMarker) resetMarkerAppearance(hoveredMarker);
      highlightMarker(foundMarker);
      hoveredMarker = foundMarker;
    }
  } else if (hoveredMarker) {
    resetMarkerAppearance(hoveredMarker);
    hoveredMarker = null;
  }

  animatePulsingMarkers();
  animateSphereAlongPath();
  controls.update();
  renderer.render(scene, camera);
}

function highlightMarker(marker) {
  marker.material.color.set(0x0000ff);
}

function resetMarkerAppearance(marker) {
  marker.material.color.set(marker.userData.originalColor);
}

function animatePulsingMarkers() {
  const scaleFactor = Math.sin(Date.now() * 0.003) * 0.3 + 1;
  scene.traverse((object) => {
    if (object.userData.pulsing) {
      object.scale.set(scaleFactor, scaleFactor, scaleFactor);
    }
  });
}

function animateSphereAlongPath() {
  if (curve) {
    flightProgress += flightSpeed;
    if (flightProgress > 1) flightProgress = 0;

    const position = curve.getPointAt(flightProgress);
    airplane.position.copy(position);

    const tangent = curve.getTangentAt(flightProgress);
    airplane.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      tangent.normalize()
    );
  }
}
