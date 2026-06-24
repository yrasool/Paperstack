'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type SheetLayer = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  baseX: number;
  baseY: number;
  baseZ: number;
  phase: number;
  speed: number;
  sway: number;
  opacity: number;
};

function newspaperLine(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  alpha = 0.35,
  height = 4,
) {
  context.fillStyle = `rgba(8, 8, 8, ${alpha})`;
  context.fillRect(x, y, width, height);
}

function newspaperFrame(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 0.38,
) {
  context.strokeStyle = `rgba(8, 8, 8, ${alpha})`;
  context.lineWidth = 3;
  context.strokeRect(x, y, width, height);
}

function drawPortrait(context: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.fillStyle = 'rgba(10, 10, 10, 0.92)';
  context.beginPath();
  context.ellipse(52, 54, 34, 45, -0.18, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#dfddd4';
  context.beginPath();
  context.ellipse(58, 58, 26, 34, -0.15, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(10, 10, 10, 0.9)';
  context.fillRect(26, 112, 72, 56);
  context.beginPath();
  context.moveTo(42, 118);
  context.lineTo(66, 154);
  context.lineTo(88, 118);
  context.fillStyle = '#f3f0e7';
  context.fill();
  context.restore();
}

function drawCar(context: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  context.strokeStyle = 'rgba(8, 8, 8, 0.55)';
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(20, 92);
  context.lineTo(52, 50);
  context.lineTo(142, 46);
  context.lineTo(188, 88);
  context.lineTo(222, 94);
  context.stroke();
  context.strokeRect(70, 58, 42, 30);
  context.strokeRect(118, 58, 42, 30);
  context.beginPath();
  context.arc(64, 106, 20, 0, Math.PI * 2);
  context.arc(176, 106, 20, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawColumns(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  columnWidth: number,
  rows: number,
  columns: number,
) {
  for (let column = 0; column < columns; column += 1) {
    const columnX = x + column * (columnWidth + 22);
    for (let row = 0; row < rows; row += 1) {
      const width = columnWidth - ((row + column) % 4) * 18;
      newspaperLine(context, columnX, y + row * 18, width, 0.32, 5);
    }
  }
}

function createNewspaperTexture({ fadeRight = true }: { fadeRight?: boolean } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 980;
  canvas.height = 1320;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = '#d8d8d4';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 28000; index += 1) {
    const value = 60 + Math.random() * 95;
    const alpha = 0.015 + Math.random() * 0.055;
    context.fillStyle = `rgba(${value}, ${value}, ${value}, ${alpha})`;
    context.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
  }

  context.strokeStyle = 'rgba(8, 8, 8, 0.62)';
  context.lineWidth = 5;
  context.strokeRect(34, 34, canvas.width - 68, canvas.height - 68);

  newspaperLine(context, 58, 64, 350, 0.74, 10);
  newspaperLine(context, 58, 90, 520, 0.3, 4);
  newspaperLine(context, 600, 78, 250, 0.54, 8);

  for (let separator = 0; separator < 4; separator += 1) {
    const x = 238 + separator * 174;
    context.fillStyle = 'rgba(8, 8, 8, 0.15)';
    context.fillRect(x, 132, 3, 1040);
  }

  drawColumns(context, 58, 142, 142, 24, 2);
  drawColumns(context, 426, 142, 132, 17, 2);
  drawColumns(context, 678, 142, 130, 28, 1);

  newspaperFrame(context, 414, 458, 220, 220, 0.48);
  drawCar(context, 426, 516, 0.88);
  newspaperFrame(context, 76, 650, 186, 246, 0.56);
  drawPortrait(context, 100, 684, 1.2);
  newspaperFrame(context, 496, 914, 220, 160, 0.42);
  newspaperLine(context, 520, 944, 142, 0.62, 8);
  drawColumns(context, 520, 982, 74, 5, 2);

  newspaperLine(context, 300, 618, 246, 0.72, 11);
  newspaperLine(context, 300, 648, 180, 0.48, 7);
  drawColumns(context, 300, 688, 126, 12, 2);

  newspaperFrame(context, 732, 730, 154, 230, 0.38);
  drawColumns(context, 752, 758, 96, 10, 1);

  if (fadeRight) {
    const gradient = context.createLinearGradient(canvas.width * 0.58, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(216, 216, 212, 0)');
    gradient.addColorStop(1, 'rgba(216, 216, 212, 0.92)');
    context.fillStyle = gradient;
    context.fillRect(canvas.width * 0.58, 0, canvas.width * 0.42, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createMistTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 800;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createRadialGradient(400, 400, 20, 400, 400, 390);
  gradient.addColorStop(0, 'rgba(220, 220, 216, 0.62)');
  gradient.addColorStop(0.48, 'rgba(220, 220, 216, 0.18)');
  gradient.addColorStop(1, 'rgba(220, 220, 216, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export default function ArchiveBackgroundScene() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 13);

    const newspaperTexture = createNewspaperTexture();
    const floatingTexture = createNewspaperTexture({ fadeRight: false });
    const mistTexture = createMistTexture();
    if (!newspaperTexture || !floatingTexture || !mistTexture) return undefined;

    const mainPaperGeometry = new THREE.PlaneGeometry(9.3, 12.5, 14, 16);
    const mainPaperPosition = mainPaperGeometry.attributes.position;
    for (let index = 0; index < mainPaperPosition.count; index += 1) {
      const x = mainPaperPosition.getX(index);
      const y = mainPaperPosition.getY(index);
      mainPaperPosition.setZ(index, Math.sin(x * 0.9) * 0.11 + Math.cos(y * 0.55) * 0.05);
    }
    mainPaperPosition.needsUpdate = true;

    const mainPaper = new THREE.Mesh(
      mainPaperGeometry,
      new THREE.MeshBasicMaterial({
        map: newspaperTexture,
        transparent: true,
        opacity: 0.36,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    mainPaper.position.set(-5.6, -0.55, -4.1);
    mainPaper.rotation.set(-0.04, 0.32, -0.13);
    scene.add(mainPaper);

    const ghostPaper = new THREE.Mesh(
      mainPaperGeometry.clone(),
      new THREE.MeshBasicMaterial({
        map: floatingTexture,
        transparent: true,
        opacity: 0.11,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ghostPaper.position.set(4.9, -0.6, -5.8);
    ghostPaper.rotation.set(0.08, -0.25, 0.08);
    ghostPaper.scale.setScalar(0.82);
    scene.add(ghostPaper);

    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({
        map: mistTexture,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
      }),
    );
    mist.position.set(3.6, 0.15, -3.4);
    scene.add(mist);

    const floatingGeometry = new THREE.PlaneGeometry(1.7, 2.35, 5, 7);
    const floatingPages: SheetLayer[] = [];

    for (let index = 0; index < 10; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        map: floatingTexture,
        color: new THREE.Color(0.9, 0.9, 0.88),
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(floatingGeometry, material);
      const baseX = -8.2 + Math.random() * 12;
      const baseY = -5 + Math.random() * 10;
      const baseZ = -2.2 + Math.random() * 1.6;
      mesh.position.set(baseX, baseY, baseZ);
      mesh.rotation.set((Math.random() - 0.5) * 0.45, 0.22 + Math.random() * 0.35, (Math.random() - 0.5) * 0.6);
      mesh.scale.setScalar(0.74 + Math.random() * 0.5);
      scene.add(mesh);

      floatingPages.push({
        mesh,
        baseX,
        baseY,
        baseZ,
        phase: Math.random(),
        speed: 0.018 + Math.random() * 0.02,
        sway: 0.2 + Math.random() * 0.26,
        opacity: 0.08 + Math.random() * 0.12,
      });
    }

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const wide = width / height;
      mainPaper.scale.setScalar(wide > 1.5 ? 1.08 : 0.86);
      mist.scale.setScalar(wide > 1.5 ? 1.15 : 1.55);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let animationFrame = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      if (!reducedMotion) {
        mainPaper.position.y = -0.55 + Math.sin(elapsed * 0.22) * 0.1;
        mainPaper.rotation.y = 0.32 + Math.sin(elapsed * 0.16) * 0.035;
        ghostPaper.position.y = -0.6 + Math.cos(elapsed * 0.18) * 0.16;
        ghostPaper.rotation.y = -0.25 + Math.sin(elapsed * 0.14) * 0.05;
        mist.position.x = 3.6 + Math.sin(elapsed * 0.11) * 0.32;
        mist.material.opacity = 0.5 + Math.sin(elapsed * 0.17) * 0.08;

        floatingPages.forEach((page, index) => {
          const loop = (page.phase + elapsed * page.speed) % 1;
          const fade =
            THREE.MathUtils.smoothstep(loop, 0.04, 0.16)
            * (1 - THREE.MathUtils.smoothstep(loop, 0.84, 0.98));
          const sway = Math.sin(elapsed * page.sway + index * 0.9);
          page.mesh.position.y = 7.4 - loop * 14.8;
          page.mesh.position.x = page.baseX + sway * 0.35;
          page.mesh.position.z = page.baseZ + Math.cos(elapsed * 0.18 + index) * 0.18;
          page.mesh.rotation.z += 0.0018 + index * 0.00008;
          page.mesh.material.opacity = page.opacity * fade;
        });

        animationFrame = window.requestAnimationFrame(animate);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      mainPaperGeometry.dispose();
      ghostPaper.geometry.dispose();
      mist.geometry.dispose();
      floatingGeometry.dispose();
      mainPaper.material.dispose();
      ghostPaper.material.dispose();
      mist.material.dispose();
      floatingPages.forEach((page) => page.mesh.material.dispose());
      newspaperTexture.dispose();
      floatingTexture.dispose();
      mistTexture.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="page-atmosphere" ref={hostRef} aria-hidden="true" />;
}
