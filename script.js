const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(0, 5, 1);
scene.add(light);
// const lightHelper = new THREE.DirectionalLightHelper(light, 1);
// scene.add(lightHelper);

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 500;

const textureLoader = new THREE.TextureLoader();
const roadTexture = textureLoader.load("water-texture.jpg");
roadTexture.wrapS = THREE.RepeatWrapping;
roadTexture.wrapT = THREE.RepeatWrapping;
roadTexture.repeat.set(4, 20);

const roadGeometry = new THREE.PlaneGeometry(10, 50);
const roadMaterial = new THREE.MeshStandardMaterial({
  map: roadTexture,
  side: THREE.DoubleSide,
});
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2;
road.position.set(0, 0.1, -5);
scene.add(road);

const grassGeometry = new THREE.PlaneGeometry(100, 50);
const grassMaterial = new THREE.MeshBasicMaterial({
  color: 0x157e00,
  side: THREE.DoubleSide,
});
const grass = new THREE.Mesh(grassGeometry, grassMaterial);
grass.rotation.x = -Math.PI / 2;
grass.position.set(0, 0, -5);
scene.add(grass);

const loader = new THREE.GLTFLoader();
let plane;
loader.load("objects/cartoon_plane.glb", (gltf) => {
  plane = gltf.scene;
  plane.castShadow = true;
  plane.position.set(0, 1, 0);
  plane.scale.set(0.08, 0.08, 0.08);
  plane.rotation.y = Math.PI;
  scene.add(plane);
  camera.lookAt(plane.position);
});

road.receiveShadow = true;
grass.receiveShadow = true;
camera.position.set(0, 3, 5);

let planeSpeed = 0;
let lives = 5;
document.getElementById("lives").innerText = `Vidas: ${lives}`;
const roadLimit = 4;
const obstacles = [];
const fuels = [];
const alphaBase = 1.0;
let alpha = alphaBase;
const maxAlpha = 3.0;
const alphaIncrement = 0.01;

function createExplosion(position) {
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(100 * 3);
  for (let i = 0; i < 100; i++) {
    positions[i * 3] = position.x + (Math.random() - 0.5) * 2;
    positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 2;
    positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 2;
  }
  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xffa500,
    size: 0.1,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);
  setTimeout(() => scene.remove(particles), 1000);
}

function createObstacle() {
  if (!plane) return;
  alpha = Math.min(maxAlpha, alpha + alphaIncrement);
  const numObstacles = Math.ceil(alpha * Math.random() * 3);

  for (let i = 0; i < numObstacles; i++) {
    loader.load("objects/tnt.glb", (gltf) => {
      const obstacle = gltf.scene;
      obstacle.scale.set(0.05, 0.05, 0.05);
      const offsetX = (Math.random() - 0.5) * 4 * alpha;
      obstacle.position.set(
        plane.position.x + offsetX,
        1,
        plane.position.z - 10
      );
      scene.add(obstacle);
      obstacles.push(obstacle);
    });
  }
}

setInterval(createObstacle, 2000);

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") planeSpeed = -0.2;
  else if (event.key === "ArrowRight") planeSpeed = 0.2;
});
window.addEventListener("keyup", () => (planeSpeed = 0));

function checkCollision(plane, object) {
  return (
    plane &&
    Math.abs(plane.position.x - object.position.x) < 1 &&
    Math.abs(plane.position.z - object.position.z) < 1.5
  );
}

function animate() {
  requestAnimationFrame(animate);
  road.position.z += 0.1;
  grass.position.z += 0.1;
  if (road.position.z > 0) road.position.z = -5;
  if (grass.position.z > 0) grass.position.z = -5;

  if (plane) {
    plane.position.x += planeSpeed;
    if (plane.position.x > roadLimit) plane.position.x = roadLimit;
    if (plane.position.x < -roadLimit) plane.position.x = -roadLimit;
  }

  obstacles.forEach((obstacle, index) => {
    obstacle.position.z += 0.1;
    if (obstacle.position.z > 5) {
      scene.remove(obstacle);
      obstacles.splice(index, 1);
    } else if (checkCollision(plane, obstacle)) {
      createExplosion(obstacle.position);
      scene.remove(obstacle);
      obstacles.splice(index, 1);
      lives--;
      document.getElementById("lives").innerText = `Vidas: ${lives}`;
      if (lives <= 0) {
        alert("Game Over!");
        location.reload();
      }
    }
  });

  renderer.render(scene, camera);
}
animate();
