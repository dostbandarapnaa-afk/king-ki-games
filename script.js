// गेम स्टेट्स
let scene, camera, renderer;
let bullets = [], enemies = [];
let score = 0, health = 100;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let gameStarted = false;

// वेब ऑडियो API (साउंड इफेक्ट्स के लिए)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playShootSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

// 1. ग्राफिक्स और 3D सीन सेटअप
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015); // धुंध और लाइटिंग इफ़ेक्ट

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // लाइटिंग (Lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // ज़मीन (Floor Textures & Grid)
    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(200, 50, 0x00ffcc, 0x444444);
    grid.position.y = 0.01;
    scene.add(grid);

    // इवेंट लिसनर्स (Controls)
    setupControls();
    
    // दुश्मन बनाना
    for(let i = 0; i < 8; i++) spawnEnemy();

    animate();
}

// 2. कंट्रोल्स और माउस लॉकिंग
function setupControls() {
    const startBtn = document.getElementById('start-btn');
    startBtn.addEventListener('click', () => {
        document.getElementById('start-screen').style.display = 'none';
        document.body.requestPointerLock();
        gameStarted = true;
    });

    document.addEventListener('keydown', (e) => {
        if (!gameStarted) return;
        if (e.code === 'KeyW') moveForward = true;
        if (e.code === 'KeyS') moveBackward = true;
        if (e.code === 'KeyA') moveLeft = true;
        if (e.code === 'KeyD') moveRight = true;
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') moveForward = false;
        if (e.code === 'KeyS') moveBackward = false;
        if (e.code === 'KeyA') moveLeft = false;
        if (e.code === 'KeyD') moveRight = false;
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === document.body) {
            camera.rotation.y -= e.movementX * 0.002;
        }
    });

    document.addEventListener('mousedown', () => {
        if (document.pointerLockElement === document.body) {
            shootBullet();
        }
    });
}

// 3. शूटिंग सिस्टम (Bullets)
function shootBullet() {
    playShootSound();
    const geo = new THREE.SphereGeometry(0.1, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const bullet = new THREE.Mesh(geo, mat);

    bullet.position.copy(camera.position);
    
    // गोली की दिशा तय करना
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    bullet.userData = { velocity: dir.multiplyScalar(1.2) };

    bullets.push(bullet);
    scene.add(bullet);
}

// 4. दुश्मन (Enemies & Challenges)
function spawnEnemy() {
    const geo = new THREE.BoxGeometry(1.5, 2, 1.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0x330011 });
    const enemy = new THREE.Mesh(geo, mat);

    // यादृच्छिक जगह पर दुश्मन पैदा करना
    enemy.position.x = (Math.random() - 0.5) * 100;
    enemy.position.z = (Math.random() - 0.5) * 100;
    enemy.position.y = 1;
    enemy.castShadow = true;

    enemies.push(enemy);
    scene.add(enemy);
}

// 5. मुख्य गेम लूप (Animation & Physics)
function animate() {
    requestAnimationFrame(animate);

    if (gameStarted) {
        // कैरेक्टर मूवमेंट
        const speed = 0.15;
        if (moveForward) camera.translateZ(-speed);
        if (moveBackward) camera.translateZ(speed);
        if (moveLeft) camera.translateX(-speed);
        if (moveRight) camera.translateX(speed);
        camera.position.y = 1.6; // ज़मीन की ऊँचाई

        // गोलियों का मूवमेंट और हिट डिटैक्शन
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            b.position.add(b.userData.velocity);

            // दुश्मनों से टकराने की जाँच
            for (let j = enemies.length - 1; j >= 0; j--) {
                let e = enemies[j];
                if (b.position.distanceTo(e.position) < 1.5) {
                    scene.remove(b);
                    scene.remove(e);
                    bullets.splice(i, 1);
                    enemies.splice(j, 1);
                    
                    score += 10;
                    document.getElementById('score-val').innerText = score;
                    spawnEnemy(); // नया दुश्मन बनाएं
                    break;
                }
            }

            // बहुत दूर जाने पर गोली हटाना
            if (b && b.position.distanceTo(camera.position) > 100) {
                scene.remove(b);
                bullets.splice(i, 1);
            }
        }

        // दुश्मन खिलाड़ी का पीछा करेंगे (AI & Difficulty)
        enemies.forEach(enemy => {
            const dir = new THREE.Vector3().subVectors(camera.position, enemy.position).normalize();
            enemy.position.x += dir.x * 0.03;
            enemy.position.z += dir.z * 0.03;

            // अगर दुश्मन खिलाड़ी को छू ले
            if (enemy.position.distanceTo(camera.position) < 1.5) {
                health -= 0.5;
                document.getElementById('health-bar').style.width = health + '%';
                if (health <= 0) {
                    alert("गेम ओवर! आपका स्कोर: " + score);
                    location.reload();
                }
            }
        });
    }

    renderer.render(scene, camera);
}

window.onload = init;
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
