// PixelBattles 3D - Main Game Code (Mesh זמני + שלבים + סיבוב מצלמה)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Three.js setup
const scene = new THREE.Scene();
let stage = 1;
scene.background = new THREE.Color(0x87CEEB); // שמיים כחולים

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Light
const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(10,20,10);
scene.add(light);

// Ground
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100,100),
    new THREE.MeshPhongMaterial({color:0x228B22})
);
ground.rotation.x = -Math.PI/2;
scene.add(ground);

// Obstacles
let obstacles = [];
function createObstacle(x,z){
    const obs = new THREE.Mesh(
        new THREE.BoxGeometry(2,2,2),
        new THREE.MeshPhongMaterial({color:0x8B4513})
    );
    obs.position.set(x,1,z);
    scene.add(obs);
    obstacles.push(obs);
}
createObstacle(5,5);
createObstacle(-5,8);

// Player - Mesh זמני
let player = new THREE.Mesh(
    new THREE.BoxGeometry(1,2,1),
    new THREE.MeshPhongMaterial({color:0x00ff00})
);
player.position.set(0,1,0);
scene.add(player);

// Camera rotation
let camAngle = 0;
function updateCamera(){
    const radius = 15;
    camera.position.x = player.position.x + radius * Math.sin(camAngle);
    camera.position.z = player.position.z + radius * Math.cos(camAngle);
    camera.position.y = player.position.y + 8;
    camera.lookAt(player.position.x, player.position.y + 1, player.position.z);
}

// Keyboard input
let keys = {};
let velocityY = 0;
let onGround = true;
document.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if(e.key === 'ArrowLeft') camAngle -= 0.05;
    if(e.key === 'ArrowRight') camAngle += 0.05;
});
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

let score = 0;

// Prizes per stage
let prizes = [];
function createPrizes(){
    prizes.forEach(p => scene.remove(p));
    prizes = [];
    for(let i=0;i<stage+2;i++){
        const p = new THREE.Mesh(
            new THREE.BoxGeometry(1,1,1),
            new THREE.MeshPhongMaterial({color:0xffff00})
        );
        p.position.set(Math.random()*20-10,0.5,Math.random()*20-10);
        scene.add(p);
        prizes.push(p);
    }
}
createPrizes();

// Background per stage
function changeBackground(stage){
    if(stage===1) scene.background=new THREE.Color(0x87CEEB);
    if(stage===2) scene.background=new THREE.Color(0xFFA500);
    if(stage===3) scene.background=new THREE.Color(0x000033);
}

// Check prizes collected
function checkPrizes(){
    for(let i=prizes.length-1;i>=0;i--){
        if(player.position.distanceTo(prizes[i].position)<1){
            scene.remove(prizes[i]);
            prizes.splice(i,1);
            score +=50;
            db.ref('players/player1/score').set(score);
        }
    }

    if(prizes.length===0){
        stage++;
        console.log('Stage',stage);
        createPrizes();
        changeBackground(stage);
    }
}

// Animate loop
function animate(){
    requestAnimationFrame(animate);

    // Player movement
    if(player){
        if(keys['w']) player.position.z -=0.2;
        if(keys['s']) player.position.z +=0.2;
        if(keys['a']) player.position.x -=0.2;
        if(keys['d']) player.position.x +=0.2;

        // Jump
        if(keys[' '] && onGround){
            velocityY = 0.3;
            onGround = false;
        }

        // Gravity
        velocityY -= 0.01;
        player.position.y += velocityY;

        if(player.position.y <=1){
            player.position.y =1;
            velocityY=0;
            onGround=true;
        }

        // Obstacles collision
        obstacles.forEach(obs => {
            if(player.position.distanceTo(obs.position)<1.5){
                player.position.x -= keys['a']?-0.2:0;
                player.position.x -= keys['d']?0.2:0;
                player.position.z -= keys['w']?-0.2:0;
                player.position.z -= keys['s']?0.2:0;
            }
        });

        // Check prizes
        checkPrizes();

        // Firebase update
        db.ref('players/player1').set({x:player.position.x,y:player.position.y,z:player.position.z});
    }

    // Other players
    db.ref('players').on('value', snapshot=>{
        const data = snapshot.val();
        for(const id in data){
            if(id !== 'player1'){
                let other = scene.getObjectByName(id);
                if(!other){
                    const mesh = new THREE.Mesh(
                        new THREE.BoxGeometry(1,2,1),
                        new THREE.MeshPhongMaterial({color:0xff0000})
                    );
                    mesh.name=id;
                    scene.add(mesh);
                }
                scene.getObjectByName(id).position.set(data[id].x,data[id].y,data[id].z);
            }
        }
    });

    // Camera
    updateCamera();

    renderer.render(scene,camera);
}
animate();
