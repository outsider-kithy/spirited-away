import * as THREE from 'three';
import { OBJLoader } from './jsm/loaders/OBJLoader.js';
import { Water } from './jsm/objects/Water.js';
import { EffectComposer } from './jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './jsm/postprocessing/UnrealBloomPass.js';

window.addEventListener('load', init, false);

window.addEventListener('resize', onWindowResize, false);

let scene, camera, renderer;

function init(){
    const radius = 10;
    const center = new THREE.Vector3(0,0,0);
    const offest = 3;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x010305, 5, 30);
    
    camera = new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,1,100);
    camera.position.set(0, 10, 20);

    renderer = new THREE.WebGLRenderer(
        { antialias: false,}
    );
    renderer.setClearColor(0x010305);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1);

    const ambientLight = new THREE.AmbientLight(0xffffff);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1, 100);
    directionalLight.position.set(0,0,100);
    directionalLight.lookAt(0,0,0);
    scene.add(directionalLight);
    
    //シリンダー
    const cylinderGeometry = new THREE.CylinderGeometry(radius * 0.9,radius * 0.9,64,32,32,false);
    const water = new Water(
        cylinderGeometry,
        {
           textureWidth:512,
           textureHeight:512,
           waterNormals: new THREE.TextureLoader().load('img/waternormals.jpg', function(texture){
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
           }),
           sunDirection: new THREE.Vector3(),
           sunColor:0x9ecfe6,
           waterColor:0x1877a3,
           distortionScale:2,
           fog:scene.fog !== undefined
        }
    );
    water.material.uniforms["cameraWorldPosition"] = { value : new THREE.Vector3() };
    scene.add(water);
    water.position.set(center.x, center.y, center.z);
    water.rotation.x = -Math.PI / 2;
    water.rotation.z = Math.PI * 0.5;

    //マテリアルカラーを12色セット
    let colorList = [
        new THREE.Color(0x00ff00),
        new THREE.Color(0xff4422),
        new THREE.Color(0x2277ff),
        new THREE.Color(0xff19c9),
        new THREE.Color(0xff9819),
        new THREE.Color(0x53edce),
        new THREE.Color(0xfc2399),
        new THREE.Color(0x68fc23),
        new THREE.Color(0x9723fc),
        new THREE.Color(0xfc6023),
        new THREE.Color(0x7623eb),
        new THREE.Color(0x4f72ff),
    ];
    
    //左側のモデルの読み込み
    let models_left = new THREE.Group();
    models_left = loadModel(models_left, colorList, center, radius);
    models_left.rotation.x = -Math.PI / 2;
    models_left.rotation.z = Math.PI * 0.5;
    models_left.position.x -= offest;
    scene.add(models_left);

    //右側のモデルの読み込み
    let models_right = new THREE.Group();
    models_right = loadModel(models_right, colorList, center, radius);
    models_right.rotation.x = Math.PI / 2;
    models_right.rotation.z = Math.PI * 0.5;
    models_right.position.x += offest;
    scene.add(models_right);

    renderer.autoClear = false;

    document.getElementById('webgl').appendChild(renderer.domElement);

    //ポストプロセッシング
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    //グローエフェクトをかける
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.01;
    bloomPass.strength = 0.5;
    bloomPass.radius = 0.2;
    composer.addPass(bloomPass);

    const amplitude = 0.5; //振幅
    const frequency = 0.5; //周波数
    let time = 0;//時間経過

    let frame;

    render();

    function render(){
        requestAnimationFrame(render);

        frame++;
        if(frame % 2 == 0){
            return;
        }

        composer.render();

        water.material.uniforms['time'].value += 1.0/60.0;
        models_left.rotation.x += 0.01;
        models_right.rotation.x += 0.01;
        time += 0.01;
        let random = Math.random() * 0.75;
        bloomPass.strength = 1 + (amplitude * Math.sin(2 * Math.PI * frequency * time) * random);

        //PC時のインタラクション
        window.onmousewheel = function(event){
            if(event.wheelDelta > 0){
                water.material.uniforms['time'].value += event.wheelDelta * 0.01;
                models_left.rotation.x += event.wheelDelta * 0.01;
                models_right.rotation.x += event.wheelDelta * 0.01;
            }
        }

    }
}

//モデルを読み込む
function loadModel(models, colorList, center, radius){
    let theta = 0;
    let step = 30 * (Math.PI / 180);

    for (let i=0; i<colorList.length; i++){
        let neonMaterial = new THREE.MeshStandardMaterial({
            color: colorList[i],  // ネオンの色を指定
            emissive: colorList[i],  // 発光色を指定
            side: THREE.DoubleSide,  // マテリアルを両面に適用する
            flatShading: true  // フラットシェーディングを有効にする
        });

        let objLoader = new OBJLoader();
        objLoader.setPath('./models/');
        objLoader.load('text'+ i +'.obj', function(object){
            object.scale.set(2.0, 2.0, 2.0);
            
            //円周を12等分した座標x,yを求める
            theta += step;
            let x = center.x + radius * Math.cos(theta);
            let y = 0;
            let z = center.z + radius * Math.sin(theta);
            object.position.set(x,y,z);

            //object.position(x, y, z)を接点とする、中心がcenter, 半径がradiusの円周上の接線を求める
            var tangent = new THREE.Vector3().subVectors(object.position, center).normalize();
            //接線に対して垂直になるように、dominoを回転させる
            object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tangent);

            models.add(object);
            
            object.traverse((child)=>{
                if(child instanceof THREE.Mesh){
                    child.material = neonMaterial;
                }
            });    
        });
    }
    return models;
}

//ブラウザをリサイズした時の挙動
function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
}