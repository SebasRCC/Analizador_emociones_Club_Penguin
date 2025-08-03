let scene, camera, renderer, mixer, model, clock;
let targetPosition = null;
let walking = false;
let walkTime = 0;
let targetRotationY = 0;
let startRotationY = 0;
let rotationProgress = 0;
let rotating = false;
let onomatopeyaSpan = null;
let onomatopeyaTimer = null;

const backgroundColors = {
  POSITIVO: "#d4f8e8",
  NEUTRO: "#f0f0f0",
  NEGATIVO: "#f8d4d4"
};
const onomatopeyas = {
  POSITIVO: "¡Genial!",
  NEUTRO: "Hmm...",
  NEGATIVO: "¡Ay no!"
};

init();

function init() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 32, 15);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444);
  light.position.set(0, 1, 0);
  scene.add(light);

  const axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);

  // Cargar modelo
  const loader = new THREE.GLTFLoader();
  loader.load('penguin.glb', function (gltf) {
    model = gltf.scene;
    model.scale.set(2.5, 2.5, 2.5);
    model.position.set(0, 0, 0);
    scene.add(model);

    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.play();
    }
  });

  // Click para moverse
  renderer.domElement.addEventListener('click', onCanvasClick);

  animate();
}

function onCanvasClick(event) {
  if (!model) return;

  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  // Intersecta con un plano imaginario horizontal en y=0
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // plano XZ
  const point = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, point);

  targetPosition = point;
  walking = true;
  walkTime = 0;
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  if (model && walking && targetPosition) {
    const pos = model.position;
    const dir = new THREE.Vector3().subVectors(targetPosition, pos);
    const distance = dir.length();

    if (distance > 0.05) {
      dir.normalize();
      model.position.addScaledVector(dir, delta * 5); // velocidad de movimiento

      // Gira hacia la dirección de movimiento
      const angle = Math.atan2(dir.x, dir.z);
      model.rotation.y = angle;

      // Simula balanceo de caminata
      walkTime += delta * 10;
      model.rotation.z = Math.sin(walkTime) * 0.1;

    } else {
      // Llegó
      walking = false;
      model.rotation.z = 0;
    }
  }


  //onomatopeya 
    if (model && onomatopeyaSpan) {
    const vector = new THREE.Vector3();
    model.getWorldPosition(vector);
    vector.y += 5.5; // un poco encima del modelo

    vector.project(camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    onomatopeyaSpan.style.left = `${x}px`;
    onomatopeyaSpan.style.top = `${y}px`;
  }


  renderer.render(scene, camera);
}



async function enviarTexto() {
  const texto = document.getElementById("inputTexto").value;

  const res = await fetch('http://localhost:5000/analizar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto })
  });

  const data = await res.json();
  mostrarResultado(data);
}

function mostrarResultado(data) {
  const resultado = document.getElementById("resultado");
  resultado.textContent = `${data.sentimiento} (${(data.confianza * 100).toFixed(2)}%)`;

  // Cambia el borde lateral de la barra izquierda
  const sidebar = document.querySelector('.sidebar');
  sidebar.style.borderLeftColor = backgroundColors[data.sentimiento];
    // Onomatopeya
  mostrarOnomatopeya(onomatopeyas[data.sentimiento]);

}

function iniciarRotacion(grados) {
  startRotationY = model.rotation.y;
  targetRotationY = grados;
  rotationProgress = 0;
  rotating = true;
}

function mostrarOnomatopeya(texto) {
  if (onomatopeyaSpan) onomatopeyaSpan.remove(); // elimina anterior si existe

  onomatopeyaSpan = document.createElement("span");
  onomatopeyaSpan.textContent = texto;
  onomatopeyaSpan.style.position = "absolute";
  onomatopeyaSpan.style.fontSize = "2em";
  onomatopeyaSpan.style.color = "#000";
  onomatopeyaSpan.style.background = "#fff";
  onomatopeyaSpan.style.padding = "10px 20px";
  onomatopeyaSpan.style.borderRadius = "10px";
  onomatopeyaSpan.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";
  onomatopeyaSpan.style.transition = "opacity 1s ease-out";
  onomatopeyaSpan.style.pointerEvents = "none";
  document.body.appendChild(onomatopeyaSpan);

  // Desaparece después de 1 segundo
  clearTimeout(onomatopeyaTimer);
  onomatopeyaTimer = setTimeout(() => {
    if (onomatopeyaSpan) {
      onomatopeyaSpan.style.opacity = "0";
      setTimeout(() => onomatopeyaSpan?.remove(), 1000);
    }
  }, 1000);
}