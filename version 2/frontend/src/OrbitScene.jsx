import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Original procedural artwork: no downloaded models or reference-site assets.
export default function OrbitScene({ progress }) {
 const host = useRef(null);
 useEffect(() => {
  const container = host.current;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { return; } // CSS orbit remains visible when WebGL is unavailable.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  container.classList.add('webgl-ready');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
  camera.position.z = 8;
  scene.add(new THREE.HemisphereLight(0xe6f8ff, 0x111322, 2.3));
  const light = new THREE.DirectionalLight(0xe2fff4, 6);
  light.position.set(-3, 5, 5); scene.add(light);
  const rim = new THREE.PointLight(0x7a8dff, 35); rim.position.set(4, 1, -1); scene.add(rim);
  const colors = [0x607f78, 0x555c9b, 0x9c775b, 0x598c88];
  const objects = colors.map((color, index) => {
   const group = new THREE.Group();
   const geometry = new THREE.IcosahedronGeometry(1.25, 2);
   const positions = geometry.attributes.position;
   const faceColors = [];
   const base = new THREE.Color(color);
   for (let face = 0; face < positions.count; face += 3) {
    const center = new THREE.Vector3();
    for (let j = 0; j < 3; j++) center.add(new THREE.Vector3().fromBufferAttribute(positions, face + j));
    center.multiplyScalar(1 / 3);
    const shade = base.clone().multiplyScalar(.5 + ((face * 17 % 29) / 29) * .9);
    for (let j = 0; j < 3; j++) {
     const vertex = new THREE.Vector3().fromBufferAttribute(positions, face + j).sub(center).multiplyScalar(.92).add(center);
     positions.setXYZ(face + j, vertex.x, vertex.y, vertex.z);
     faceColors.push(shade.r, shade.g, shade.b);
    }
   }
   geometry.setAttribute('color', new THREE.Float32BufferAttribute(faceColors, 3));
   geometry.computeVertexNormals();
   group.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: .65, roughness: .33, flatShading: true, side: THREE.DoubleSide })));
   group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.17, 2), new THREE.MeshStandardMaterial({ color: 0x101719, metalness: .6, roughness: .5 })));
   scene.add(group);
   return group;
  });
  const orbit = new THREE.Group();
  for (let i = 0; i < 7; i++) {
   const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(.06 + (i % 3) * .035, 1), new THREE.MeshStandardMaterial({ color: 0x8d9daa, metalness: .4, roughness: .6 }));
   moon.userData.phase = i * 2.4; orbit.add(moon);
  }
  scene.add(orbit);
  const points = [];
  for (let i = 0; i < 220; i++) points.push(Math.sin(i * 127.1) * 18, Math.cos(i * 311.7) * 12, -3 - (i % 11));
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xc2d2e6, size: .015, transparent: true, opacity: .65 })));
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = media.matches, visible = true, frame, active = true, drag = 0, previousX;
  const onMotion = event => { reduced = event.matches; };
  const onDown = event => { previousX = event.clientX; };
  const onMove = event => { if (previousX !== undefined) { drag += (event.clientX - previousX) * .008; previousX = event.clientX; } };
  const onUp = () => { previousX = undefined; };
  const onLoss = () => { active = false; container.classList.remove('webgl-ready'); };
  renderer.domElement.addEventListener('webglcontextlost', onLoss);
  container.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  media.addEventListener('change', onMotion);
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); observer.observe(container);
  const resize = new ResizeObserver(() => {
   const { width, height } = container.getBoundingClientRect();
   if (!width || !height) return;
   renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
  }); resize.observe(container);
  function render(time) {
   if (!active) return;
   frame = requestAnimationFrame(render);
   if (!visible || document.hidden) return;
   const p = progress.current * 3;
   const mobile = container.clientWidth < 760;
   objects.forEach((object, index) => {
    const distance = index - p;
    object.position.set(mobile ? .1 : 1.55, -distance * 3.5 + (mobile ? -.65 : 0), -Math.abs(distance) * 1.7);
    const scale = Math.max(.25, 1 - Math.abs(distance) * .16);
    object.scale.setScalar(scale);
    object.rotation.set(.2 + p * .1, drag + p * .9 + (reduced ? 0 : time * .00008), .15 + index * .3);
   });
   orbit.children.forEach((moon, index) => {
    const angle = moon.userData.phase + p * .8 + (reduced ? 0 : time * .000035);
    moon.position.set((mobile ? .1 : 1.55) + Math.cos(angle) * 2.4, Math.sin(angle) * 1.8 - (mobile ? .6 : 0), Math.sin(angle) * 1.3);
   });
   renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(render);
  return () => {
   active = false; cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect();
   media.removeEventListener('change', onMotion); container.removeEventListener('pointerdown', onDown);
   window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
   renderer.domElement.removeEventListener('webglcontextlost', onLoss);
   scene.traverse(object => { object.geometry?.dispose(); if (object.material) object.material.dispose(); });
   renderer.dispose(); renderer.domElement.remove(); container.classList.remove('webgl-ready');
  };
 }, [progress]);
 return <div className="orbit-canvas" ref={host} aria-hidden="true"><div className="orbit-fallback"/></div>;
}
