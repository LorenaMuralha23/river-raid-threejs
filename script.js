const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(0, 5, 1);
scene.add(light);

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
  const particleCount = 100;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3); // Armazena cores RGB

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;

    // Velocidade aleatória para cada partícula
    velocities[i * 3] = (Math.random() - 0.5) * 0.2;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

    // Definição de cor variando entre vermelho, laranja e amarelo
    const colorChoice = Math.random();
    if (colorChoice < 0.33) {
      colors[i * 3] = 1.0; // Vermelho
      colors[i * 3 + 1] = Math.random() * 0.5; // Pouco verde
      colors[i * 3 + 2] = 0.0; // Sem azul
    } else if (colorChoice < 0.66) {
      colors[i * 3] = 1.0; // Laranja (mais vermelho)
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.5; // Meio verde
      colors[i * 3 + 2] = 0.0;
    } else {
      colors[i * 3] = 1.0; // Amarelo (vermelho + verde)
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 0.0;
    }
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    vertexColors: true, // Habilita cores individuais para cada partícula
    size: 0.15,
    transparent: true,
    opacity: 1.0,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  let time = 0;
  const explosionDuration = 50; // Duração da explosão em frames

  function animateParticles() {
    if (time >= explosionDuration) {
      scene.remove(particles);
      return;
    }

    const positionsArray = particleGeometry.attributes.position.array;
    const colorsArray = particleGeometry.attributes.color.array;

    for (let i = 0; i < particleCount; i++) {
      positionsArray[i * 3] += velocities[i * 3];
      positionsArray[i * 3 + 1] += velocities[i * 3 + 1];
      positionsArray[i * 3 + 2] += velocities[i * 3 + 2];

      // Escurecendo as partículas conforme o tempo passa
      colorsArray[i * 3] = Math.max(0, colorsArray[i * 3] - 0.02);
      colorsArray[i * 3 + 1] = Math.max(0, colorsArray[i * 3 + 1] - 0.02);
      colorsArray[i * 3 + 2] = Math.max(0, colorsArray[i * 3 + 2] - 0.02);
    }

    particleMaterial.opacity -= 0.02;
    particleGeometry.attributes.position.needsUpdate = true;
    particleGeometry.attributes.color.needsUpdate = true;

    time++;
    requestAnimationFrame(animateParticles);
  }

  animateParticles();
}

function createFuelTank() {
  if (!plane) return;
  loader.load("objects/fuel_tank.glb", (gltf) => {
    const fuel = gltf.scene;
    fuel.scale.set(0.01, 0.01, 0.01);
    fuel.position.set(
      (Math.random() * 8 - 4), // Posição X aleatória dentro dos limites da pista
      1, // Posição Y fixa
      plane.position.z - 20 // Posição Z atrás do avião
    );
    scene.add(fuel);
    fuels.push(fuel);
  });
}

setInterval(createFuelTank, Math.random() * (12000 - 8000) + 8000);

function createLifeParticles(position) {
  const particleCount = 50; // Número de partículas
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3); // Cores das partículas

  // Criação das partículas
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = position.x + (Math.random() - 0.5) * 2; // Posição X aleatória
    positions[i * 3 + 1] = position.y + Math.random() * 2; // Posição Y aleatória
    positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 2; // Posição Z aleatória

    // Cores em tons de verde
    colors[i * 3] = 0.0; // Vermelho (0)
    colors[i * 3 + 1] = Math.random() * 0.5 + 0.5; // Verde (0.5 a 1.0)
    colors[i * 3 + 2] = 0.0; // Azul (0)
  }

  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    vertexColors: true, // Usa cores individuais para cada partícula
    size: 0.15,
    transparent: true,
    opacity: 1.0,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Animação das partículas
  let time = 0;
  const duration = 50; // Duração da animação em frames

  function animateParticles() {
    if (time >= duration) {
      scene.remove(particles);
      return;
    }

    const positionsArray = particleGeometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      positionsArray[i * 3 + 1] += 0.05; // Move as partículas para cima
    }

    particleMaterial.opacity -= 0.02; // Diminui a opacidade das partículas
    particleGeometry.attributes.position.needsUpdate = true;
    time++;
    requestAnimationFrame(animateParticles);
  }

  animateParticles();
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

  // Movendo e verificando colisões com os tanques de combustível
  fuels.forEach((fuel, index) => {
    fuel.position.z += 0.1; // Move o tanque junto com o cenário
    if (fuel.position.z > 5) {
      scene.remove(fuel); // Remove o tanque se ele sair da tela
      fuels.splice(index, 1);
    } else if (checkCollision(plane, fuel)) {
      createLifeParticles(fuel.position); // Cria partículas ao coletar o tanque
      scene.remove(fuel); // Remove o tanque após a colisão
      fuels.splice(index, 1);
      lives++; // Aumenta a vida do jogador
      document.getElementById("lives").innerText = `Vidas: ${lives}`;
    }
  });

  // Movendo e verificando colisões com os obstáculos
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