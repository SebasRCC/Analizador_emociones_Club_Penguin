let scene, camera, renderer, mixer, model, clock, ground;
let targetPosition = null;
let walking = false;
let walkTime = 0;
let onomatopeyaSpan = null;
let onomatopeyaTimer = null;

// --- GESTOR DE ANIMACIONES ---
let actions = {};
let activeAction;

// Nombres para las animaciones que SÍ podrían existir
const ANIMATION_NAMES = {
    IDLE: 'Idle',
    WALK: 'Walk',
};

// --- NUEVA VARIABLE PARA CONTROLAR EL BAILE ---
let isDancing = false;
let danceTime = 0;

const backgroundColors = {
  POSITIVO: "rgba(212, 248, 232, 0.85)",
  NEUTRO: "rgba(240, 240, 240, 0.85)",
  NEGATIVO: "rgba(248, 212, 212, 0.85)"
};

const onomatopeyas = {
  POSITIVO: "¡Genial!",
  NEUTRO: "Hmm...",
  NEGATIVO: "¡Ay no!"
};

const sensitiveKeywords = [
    "suicidio", "suicidarme", "matarme", "quitarme la vida", "desaparecer para siempre",
    "no quiero vivir", "acabar con todo", "morirme", "nadie me quiere", "sin esperanza"
];

init();

document.addEventListener('DOMContentLoaded', () => {
    const resultadoEl = document.getElementById("resultado");
    resultadoEl.classList.add('hidden');

    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalOverlay = document.getElementById('supportModal');
    
    closeModalBtn.addEventListener('click', hideSupportModal);
    modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) {
            hideSupportModal();
        }
    });
});


function init() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  
  scene.background = new THREE.Color(0xf0f0f0);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 32, 15); 
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(-8, 12, 8);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  
  directionalLight.shadow.camera.top = 30;
  directionalLight.shadow.camera.bottom = -30;
  directionalLight.shadow.camera.left = -30;
  directionalLight.shadow.camera.right = 30;

  scene.add(directionalLight);

  ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshLambertMaterial({ color: 0xf0f0f0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const loader = new THREE.GLTFLoader();
  loader.load('penguin.glb', function (gltf) {
    model = gltf.scene;
    model.scale.set(2.5, 2.5, 2.5);
    model.position.set(0, 0, 0);
    
    model.traverse(function(node) {
        if (node.isMesh) {
            node.castShadow = true;
        }
    });

    scene.add(model);

    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        actions[clip.name] = action;
    });

    const initialAction = actions[ANIMATION_NAMES.IDLE] || (gltf.animations.length > 0 ? mixer.clipAction(gltf.animations[0]) : null);
    if(initialAction){
        setActiveAction(initialAction);
    }
  });

  renderer.domElement.addEventListener('click', onCanvasClick);

  animate();
}

function onCanvasClick(event) {
  if (!model) return;
  isDancing = false; // Detener el baile si se hace clic para caminar

  const sidebar = document.querySelector('.sidebar').getBoundingClientRect();
  if (event.clientX < sidebar.right) return; 

  const mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(ground);
  if (intersects.length > 0) {
      targetPosition = intersects[0].point;
      walking = true;
      const walkAction = actions[ANIMATION_NAMES.WALK];
      if (walkAction) setActiveAction(walkAction);
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  // --- LÓGICA DE ANIMACIÓN DE BAILE PERSONALIZADA ---
  if (isDancing && model) {
      danceTime += delta * 5; // Velocidad del baile
      // Movimiento de balanceo del cuerpo
      model.rotation.y = Math.sin(danceTime * 0.5) * 0.2;
      // Pequeño salto
      model.position.y = Math.abs(Math.sin(danceTime)) * 0.5;
  }

  // --- LÓGICA DE CAMINAR ---
  if (model && walking && targetPosition) {
    isDancing = false; // Asegurarse de que no baile mientras camina
    const pos = model.position;
    const dir = new THREE.Vector3().subVectors(targetPosition, pos);
    const distance = dir.length();

    if (distance > 0.05) {
      dir.normalize();
      model.position.addScaledVector(dir, delta * 10);
      const angle = Math.atan2(dir.x, dir.z);
      model.rotation.y = angle;
      
      // CORRECCIÓN: Se restaura la animación de balanceo al caminar
      walkTime += delta * 10;
      model.rotation.z = Math.sin(walkTime) * 0.1;

    } else {
      walking = false;
      model.rotation.z = 0; // Detener el balanceo al llegar
      const idleAction = actions[ANIMATION_NAMES.IDLE];
      if (idleAction) setActiveAction(idleAction);
    }
  }

  if (model && onomatopeyaSpan) {
    const vector = new THREE.Vector3();
    model.getWorldPosition(vector);
    vector.y += 5.5;
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
  const boton = document.querySelector("button");

  if (!texto.trim()) return;

  boton.disabled = true;
  boton.textContent = "Analizando...";

  try {
    const res = await fetch('http://localhost:5000/analizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto })
    });
    const data = await res.json();
    mostrarResultado(data, texto);
  } catch (error) {
    console.error("Error al conectar con el servidor:", error);
    document.getElementById("resultado").textContent = "Error de conexión.";
  } finally {
    boton.disabled = false;
    boton.textContent = "Analizar";
  }
}

function checkSensitiveContent(text) {
    const lowerText = text.toLowerCase();
    return sensitiveKeywords.some(keyword => lowerText.includes(keyword));
}

function mostrarResultado(data, originalText) {
  const resultado = document.getElementById("resultado");
  resultado.classList.remove('hidden');
  resultado.textContent = `${data.sentimiento} (${(data.confianza * 100).toFixed(2)}%)`;

  const sidebar = document.querySelector('.sidebar');
  sidebar.style.backgroundColor = backgroundColors[data.sentimiento];

  const borderColors = {
      POSITIVO: "#28a745",
      NEUTRO: "#6c757d",
      NEGATIVO: "#dc3545"
  };
  sidebar.style.borderLeftColor = borderColors[data.sentimiento];

  const isSensitive = checkSensitiveContent(originalText);
  if (isSensitive) {
      showSupportModal();
      playEmotionAnimation('NEGATIVO');
  } else {
      mostrarOnomatopeya(onomatopeyas[data.sentimiento]);
      playEmotionAnimation(data.sentimiento);
  }
}

function setActiveAction(toAction) {
    if (activeAction === toAction || !toAction) return;
    if (activeAction) activeAction.fadeOut(0.5);
    toAction.reset().setEffectiveWeight(1).fadeIn(0.5).play();
    activeAction = toAction;
}

function playEmotionAnimation(emotion) {
    isDancing = false; // Detener el baile personalizado por defecto
    let nextAction;
    switch (emotion) {
        case 'POSITIVO':
            // Iniciar nuestra animación de baile personalizada
            isDancing = true;
            // Si hay una animación de 'idle', la dejamos de fondo
            nextAction = actions[ANIMATION_NAMES.IDLE];
            break;
        case 'NEGATIVO':
            // Aquí podrías tener una animación 'Sad' si existiera
            nextAction = actions[ANIMATION_NAMES.IDLE];
            break;
        default:
            nextAction = actions[ANIMATION_NAMES.IDLE];
            break;
    }
    if (nextAction) {
        setActiveAction(nextAction);
    }
}

function showSupportModal() {
    const modalOverlay = document.getElementById('supportModal');
    modalOverlay.classList.remove('hidden');
}

function hideSupportModal() {
    const modalOverlay = document.getElementById('supportModal');
    modalOverlay.classList.add('hidden');
}

function mostrarOnomatopeya(texto) {
  if (onomatopeyaSpan) onomatopeyaSpan.remove();

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
  onomatopeyaSpan.classList.add("onomatopeya"); 
  document.body.appendChild(onomatopeyaSpan);

  clearTimeout(onomatopeyaTimer);
  onomatopeyaTimer = setTimeout(() => {
    if (onomatopeyaSpan) {
      onomatopeyaSpan.style.opacity = "0";
      setTimeout(() => onomatopeyaSpan?.remove(), 1000);
    }
  }, 1500);
}
