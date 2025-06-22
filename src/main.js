// src/main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './style.css';

// ■ 1. 基本設定（シーン、カメラ、レンダラー）
const scene = new THREE.Scene();

// 夜明け前のブルー
const preDawnBlue = 0x02081a;
scene.fog = new THREE.FogExp2(preDawnBlue, 0.03); 

// サイズ管理オブジェクト
const sizes = {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight
}

const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  1000
);
camera.position.set(0, 0, 30);

const canvas = document.querySelector('.webgl');
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true  // ★★★ 透明な背景を有効化 ★★★
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// renderer.setClearColor()は使わない（透明にするため）

// ■ OrbitControlsの追加
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 全ての世界を格納するグループを作成
const world = new THREE.Group();
scene.add(world);


// ■ 2. フラクタル成長のロジック

const MAX_POINTS_PER_BRANCH = 5000;
const MAX_BRANCHES = 40;

class Branch {
  constructor(color, startPosition) {
    const positions = new Float32Array(MAX_POINTS_PER_BRANCH * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.material = new THREE.LineBasicMaterial({
      color: color,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.8,
    });
    
    this.originalColor = new THREE.Color(color);

    this.line = new THREE.Line(this.geometry, this.material);
    this.currentPosition = startPosition.clone();
    this.vertices = [this.currentPosition.clone()];
    this.pointsDrawn = 0;
  }

  update() {
    if (this.pointsDrawn < MAX_POINTS_PER_BRANCH - 1) {
      const newDirection = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();

      if (this.vertices.length > 1) {
        const previousDirection = new THREE.Vector3().subVectors(
          this.vertices[this.vertices.length - 1], 
          this.vertices[this.vertices.length - 2]
        ).normalize();
        newDirection.add(previousDirection).normalize();
      }

      this.currentPosition.add(newDirection.multiplyScalar(0.3));
      this.vertices.push(this.currentPosition.clone());

      const positions = this.geometry.attributes.position.array;
      const p1 = this.vertices[this.pointsDrawn];
      const p2 = this.vertices[this.pointsDrawn + 1];

      positions[this.pointsDrawn * 3] = p1.x;
      positions[this.pointsDrawn * 3 + 1] = p1.y;
      positions[this.pointsDrawn * 3 + 2] = p1.z;
      
      positions[(this.pointsDrawn + 1) * 3] = p2.x;
      positions[(this.pointsDrawn + 1) * 3 + 1] = p2.y;
      positions[(this.pointsDrawn + 1) * 3 + 2] = p2.z;
      
      this.pointsDrawn++;
      
      this.geometry.setDrawRange(0, this.pointsDrawn);
      this.geometry.attributes.position.needsUpdate = true;
    }
  }
}

const colors = [0x00aaff, 0xff00ff, 0xffff00];
const branches = [];


// 2.5 意識の砂嵐（パーティクル）の作成
const particlesCount = 50000;
const particlePositions = new Float32Array(particlesCount * 3);
const particleVelocities = new Float32Array(particlesCount * 3);
const stormArea = 60;

for (let i = 0; i < particlesCount; i++) {
    particlePositions[i * 3 + 0] = (Math.random() - 0.5) * stormArea;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * stormArea;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * stormArea;

    particleVelocities[i * 3 + 0] = (Math.random() - 0.5) * 0.005;
    particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
    particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
}

const particlesGeometry = new THREE.BufferGeometry();
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

const particlesMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.03,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
});

const consciousnessStorm = new THREE.Points(particlesGeometry, particlesMaterial);
world.add(consciousnessStorm);


// ■ 3. スクロールによる進化制御とセクションアニメーション
let scrollY = window.scrollY;
let currentSection = 0;

// セクションの監視
const observerOptions = {
  threshold: 0.5
};

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
    }
  });
}, observerOptions);

// 全てのセクションを監視
document.querySelectorAll('.section').forEach(section => {
  sectionObserver.observe(section);
});

window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
  const newSection = Math.round(scrollY / sizes.height);

  if (newSection !== currentSection) {
    currentSection = newSection;
    console.log('Evolution Stage:', currentSection);
  }
});


// ■ 4. アニメーションループ
const clock = new THREE.Clock(); 
let previousTime = 0;
let initialBranchesCreated = false;

const animate = () => {
  const elapsedTime = clock.getElapsedTime(); 
  const deltaTime = elapsedTime - previousTime; 
  previousTime = elapsedTime; 

  // ステージ1：最初の創発 (0.5秒後に自動実行)
  if (elapsedTime > 0.5 && !initialBranchesCreated) {
    colors.forEach(color => {
      const branch = new Branch(color, new THREE.Vector3(0, 0, 0));
      branches.push(branch);
      world.add(branch.line);
    });
    initialBranchesCreated = true;
  }

  // ステージ2：拡張（フラクタル分岐）
  if (currentSection >= 2 && branches.length < MAX_BRANCHES && Math.random() < 0.05) {
      const parentBranch = branches[Math.floor(Math.random() * branches.length)];
      if (parentBranch.vertices.length > 10) {
          const spawnIndex = Math.floor(Math.random() * (parentBranch.vertices.length - 1));
          const spawnPoint = parentBranch.vertices[spawnIndex];
          
          const newColor = colors[Math.floor(Math.random() * colors.length)];
          const newBranch = new Branch(newColor, spawnPoint);
          branches.push(newBranch);
          world.add(newBranch.line);
      }
  }

  // 各線を更新
  branches.forEach(branch => { branch.update(); });

  // 砂嵐を更新
  const stormPositions = consciousnessStorm.geometry.attributes.position.array;
  const halfStorm = stormArea / 2;
  for (let i = 0; i < particlesCount; i++) {
    const i3 = i * 3;
    stormPositions[i3 + 0] += particleVelocities[i3 + 0];
    stormPositions[i3 + 1] += particleVelocities[i3 + 1];
    stormPositions[i3 + 2] += particleVelocities[i3 + 2];
    
    // 3次元的にループさせる
    if (stormPositions[i3 + 0] > halfStorm) stormPositions[i3 + 0] = -halfStorm;
    if (stormPositions[i3 + 0] < -halfStorm) stormPositions[i3 + 0] = halfStorm;
    if (stormPositions[i3 + 1] > halfStorm) stormPositions[i3 + 1] = -halfStorm;
    if (stormPositions[i3 + 1] < -halfStorm) stormPositions[i3 + 1] = halfStorm;
    if (stormPositions[i3 + 2] > halfStorm) stormPositions[i3 + 2] = -halfStorm;
    if (stormPositions[i3 + 2] < -halfStorm) stormPositions[i3 + 2] = halfStorm;
  }
  consciousnessStorm.geometry.attributes.position.needsUpdate = true;
  
  // ステージ3：覚醒（脈動）
  if (currentSection >= 3) {
      const pulse = (Math.sin(elapsedTime * 4.0) + 1.0) / 2.0;
      particlesMaterial.size = 0.03 + pulse * 0.03;
      particlesMaterial.opacity = 0.3 + pulse * 0.3;
      const targetColor = new THREE.Color(0xffffff);
      branches.forEach(branch => {
          branch.material.opacity = 0.5 + pulse * 0.5;
          branch.material.color.copy(branch.originalColor).lerp(targetColor, pulse);
      });
  } else {
      const lerpFactor = 0.1;
      particlesMaterial.size += (0.03 - particlesMaterial.size) * lerpFactor;
      particlesMaterial.opacity += (0.3 - particlesMaterial.opacity) * lerpFactor;
      branches.forEach(branch => {
          branch.material.opacity += (0.8 - branch.material.opacity) * lerpFactor;
          branch.material.color.lerp(branch.originalColor, lerpFactor);
      });
  }

  // スクロールで世界を回転
  const targetRotationY = (scrollY / sizes.height) * 0.5;
  world.rotation.y += (targetRotationY - world.rotation.y) * 5 * deltaTime;

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

animate();

// ■ 5. ウィンドウリサイズへの対応
window.addEventListener('resize', () => {
    sizes.width = document.documentElement.clientWidth;
    sizes.height = document.documentElement.clientHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});