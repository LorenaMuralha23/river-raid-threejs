const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(5, 10, 5);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Criando o chão
const roadGeometry = new THREE.PlaneGeometry(10, 50);
const roadMaterial = new THREE.MeshBasicMaterial({ color: 0x0D5DA8, side: THREE.DoubleSide });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2;
road.position.set(0, 0.1, -5);
scene.add(road);

// Criando a grama ao lado da pista
const grassGeometry = new THREE.PlaneGeometry(100, 50);
const grassMaterial = new THREE.MeshBasicMaterial({ color: 0x157E00, side: THREE.DoubleSide });
const grass = new THREE.Mesh(grassGeometry, grassMaterial);
grass.rotation.x = -Math.PI / 2;
grass.position.set(0, 0, -5);
scene.add(grass);

// Carregando o avião
const loader = new THREE.GLTFLoader();
let plane;
loader.load('objects/cartoon_plane.glb', (gltf) => {
    plane = gltf.scene;
    plane.position.set(0, 1, 0);
    plane.scale.set(0.08, 0.08, 0.08);
    plane.rotation.y = Math.PI;
    scene.add(plane);
    camera.lookAt(plane.position);
});

camera.position.set(0, 3, 5);

let planeSpeed = 0;
let lives = 5;
document.getElementById("lives").innerText = `Vidas: ${lives}`;
const roadLimit = 4;

// Criando obstáculos
const obstacles = [];
function createObstacle() {
    const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
    const obstacleMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    obstacle.position.set((Math.random() * 8) - 4, 1, -10);
    scene.add(obstacle);
    obstacles.push(obstacle);
}

setInterval(createObstacle, 2000);

window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
        planeSpeed = -0.2;
    } else if (event.key === "ArrowRight") {
        planeSpeed = 0.2;
    }
});

window.addEventListener("keyup", () => {
    planeSpeed = 0;
});

function checkCollision(plane, obstacle) {
    return plane && Math.abs(plane.position.x - obstacle.position.x) < 1 && Math.abs(plane.position.z - obstacle.position.z) < 1.5;
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

    // Movendo obstáculos e verificando colisão
    obstacles.forEach((obstacle, index) => {
        obstacle.position.z += 0.1;
        if (obstacle.position.z > 5) {
            scene.remove(obstacle);
            obstacles.splice(index, 1);
        } else if (checkCollision(plane, obstacle)) {
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