import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

function connectionGlobe() {
 const globe = new THREE.Group();
 globe.add(new THREE.Mesh(new THREE.SphereGeometry(1.25, 48, 32), new THREE.MeshStandardMaterial({ color: 0x12293b, metalness: .3, roughness: .55 })));
 globe.add(new THREE.Mesh(new THREE.SphereGeometry(1.265, 24, 16), new THREE.MeshBasicMaterial({ color: 0x86c6bc, wireframe: true, transparent: true, opacity: .09 })));
 // Stylized continental silhouettes; decorative, not a geographic data layer.
 const land = [
  [[-165,65],[-140,70],[-125,55],[-100,50],[-65,50],[-55,30],[-80,10],[-105,20],[-125,45]],
  [[-80,10],[-50,5],[-35,-10],[-50,-40],[-70,-55],[-80,-20]],
  [[-15,35],[5,55],[40,70],[100,70],[155,55],[145,25],[120,5],[105,20],[80,5],[60,30],[35,30],[30,5],[15,-35],[-5,-25],[-18,10]],
  [[110,-10],[150,-10],[155,-35],[130,-45],[110,-25]],
  [[-55,60],[-25,65],[-30,82],[-55,80]]
 ];
 function inside(x, y, polygon) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
   const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
   if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) result = !result;
  }
  return result;
 }
 function point(lon, lat, radius) {
  const a = THREE.MathUtils.degToRad(lon), b = THREE.MathUtils.degToRad(lat);
  return new THREE.Vector3(radius * Math.cos(b) * Math.sin(a), radius * Math.sin(b), radius * Math.cos(b) * Math.cos(a));
 }
 const dots = [];
 for (let lat = -65; lat < 80; lat += 3) for (let lon = -180; lon < 180; lon += 3) {
  if (land.some(polygon => inside(lon, lat, polygon))) dots.push(...point(lon, lat, 1.28).toArray());
 }
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute('position', new THREE.Float32BufferAttribute(dots, 3));
 globe.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xbfe7d2, size: .025 })));
 for (const [from, to] of [[[0,50],[75,20]], [[75,20],[135,-25]], [[-65,40],[0,50]]]) {
  const start = point(...from, 1.3), end = point(...to, 1.3);
  const mid = start.clone().add(end).normalize().multiplyScalar(1.8);
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
  const arc = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
  globe.add(new THREE.Line(arc, new THREE.LineBasicMaterial({ color: 0xc8ead8, transparent: true, opacity: .65 })));
 }
 return globe;
}

// Original procedural artwork: no downloaded models or reference-site assets.
export default function OrbitScene({ progress, motion }) {
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
   if (index === 3) { const globe = connectionGlobe(); scene.add(globe); return globe; }
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
   geometry.userData.original = positions.array.slice();
   geometry.userData.directions = [];
   for(let face=0;face<positions.count;face+=3){const center=new THREE.Vector3();for(let j=0;j<3;j++)center.add(new THREE.Vector3().fromBufferAttribute(positions,face+j));geometry.userData.directions.push(center.normalize());}
   group.userData.expansion = 0;
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
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.8,.006,6,128),new THREE.MeshBasicMaterial({color:0xbfe7d2,transparent:true,opacity:.2}));
  ring.rotation.set(1.1,.25,.15);scene.add(ring);
  const points = [], sizes = [], phases = [];
  // Deterministic scatter keeps the galaxy stable between visits and resizes.
  const scatter = seed => { const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
  for (let i = 0; i < 720; i++) {
   const depth = scatter(i * 3 + 1) * 10;
   points.push((scatter(i * 3 + 2) - .5) * (20 + depth), (scatter(i * 3 + 3) - .5) * (13 + depth * .6), -3 - depth);
   sizes.push(1.25 + Math.pow(scatter(i + 2000), 3) * 1.9);
   phases.push(scatter(i + 4000) * Math.PI * 2);
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  starsGeometry.setAttribute('starSize', new THREE.Float32BufferAttribute(sizes, 1));
  starsGeometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
  const starsMaterial = new THREE.ShaderMaterial({
   transparent: true, depthWrite: false,
   uniforms: { time: { value: 0 }, pixelRatio: { value: renderer.getPixelRatio() } },
   vertexShader: `
    attribute float starSize;
    attribute float phase;
    uniform float time;
    uniform float pixelRatio;
    varying float brightness;
    void main() {
     brightness = .8 + .18 * sin(time * .55 + phase);
     gl_PointSize = starSize * pixelRatio;
     gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
   `,
   fragmentShader: `
    varying float brightness;
    void main() {
     float radius = length(gl_PointCoord - vec2(.5));
     float alpha = (1.0 - smoothstep(.15, .5, radius)) * brightness;
     gl_FragColor = vec4(vec3(1.0), alpha);
    }
   `
  });
  const stars = new THREE.Points(starsGeometry, starsMaterial); scene.add(stars);
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = media.matches, visible = true, frame, active = true, drag = 0, previousX, lastRender = 0;
  const onMotion = event => { reduced = event.matches; };
  const onDown = event => { previousX = event.clientX; };
  const onMove = event => { motion.current.pointerX=event.clientX/window.innerWidth*2-1;motion.current.pointerY=event.clientY/window.innerHeight*2-1;if (previousX !== undefined) { drag += (event.clientX - previousX) * .008; previousX = event.clientX; } };
  const onUp = () => { previousX = undefined; };
  const onLoss = () => { active = false; container.classList.remove('webgl-ready'); };
  renderer.domElement.addEventListener('webglcontextlost', onLoss);
  container.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
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
   if (!visible || document.hidden || time - lastRender < 32) return;
   lastRender = time;
   const p = progress.current * 3;
   const mobile = container.clientWidth < 760;
   const input = motion.current, selected = input.openIndex;
   const opened = selected !== null;
   const target = new THREE.Vector3();
   objects.forEach((object, index) => {
    const distance = index - p;
    object.visible = opened ? index === selected : !mobile || Math.abs(distance) < .9;
    target.set(opened ? mobile ? .1 : -1.8 : mobile ? .1 : 1.55, opened ? mobile ? 1.5 : .05 : -distance * 3.5 + (mobile ? -.65 : 0), opened ? 0 : -Math.abs(distance) * 1.7);
    if(reduced)object.position.copy(target);else object.position.lerp(target,.16);
    const scale = opened ? mobile ? .76 : 1 : Math.max(.25, 1 - Math.abs(distance) * .16);
    object.scale.setScalar(scale);
    object.rotation.set((index === 3 ? -.12 : .2 + p * .1) + input.tilt, drag + input.drag + (index === 3 ? -.35 : p * .9) + (reduced ? 0 : time * .00008), index === 3 ? .12 : .15 + index * .3);
    const shell = object.children[0];
    if(shell.geometry.userData.original){
     const destination = selected === index ? 1 : input.hover && Math.abs(distance)<.5 ? .1 : 0;
     object.userData.expansion = reduced ? destination : object.userData.expansion + (destination-object.userData.expansion)*.12;
     const expansion=object.userData.expansion, positions=shell.geometry.attributes.position, original=shell.geometry.userData.original;
     for(let face=0;face<positions.count;face+=3){
      const direction=shell.geometry.userData.directions[face/3], spread=expansion*(.55+(face%11)*.04);
      for(let j=0;j<3;j++){const k=(face+j)*3;positions.setXYZ(face+j,original[k]+direction.x*spread,original[k+1]+direction.y*spread,original[k+2]+direction.z*spread);}
     }
     positions.needsUpdate=true;
     const core=object.children[1];core.scale.setScalar(1-expansion*.55);core.material.emissive.setHex(colors[index]);core.material.emissiveIntensity=expansion*.7;
    }
   });
   const orbitX=opened ? mobile ? .1 : -1.8 : mobile ? .1 : 1.55;
   orbit.children.forEach((moon) => {
    const angle=moon.userData.phase+p*.8+(reduced?0:time*.000035);
    moon.position.set(orbitX+Math.cos(angle)*2.4,Math.sin(angle)*1.8+(opened&&mobile?1.5:mobile?-.6:0),Math.sin(angle)*1.3);
   });
   ring.position.set(orbitX,opened&&mobile?1.5:mobile?-.65:0,0);ring.rotation.z=p*.3;
   const accent=new THREE.Color(colors[opened?selected:Math.min(3,Math.round(p))]);ring.material.color.lerp(accent,.1);
   const shiftX=reduced?0:input.pointerX*.12,shiftY=reduced?0:-input.pointerY*.08;
   camera.position.x+=(shiftX-camera.position.x)*.08;camera.position.y+=(shiftY-camera.position.y)*.08;camera.lookAt(0,0,0);
   starsMaterial.uniforms.time.value = reduced ? 0 : time * .001;
   stars.rotation.y=reduced?0:input.pointerX*.025;stars.rotation.x=reduced?0:input.pointerY*.012;
   renderer.render(scene, camera);
  }
  frame = requestAnimationFrame(render);
  return () => {
   active = false; cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect();
   media.removeEventListener('change', onMotion); container.removeEventListener('pointerdown', onDown);
   window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
   window.removeEventListener('pointercancel', onUp);
   renderer.domElement.removeEventListener('webglcontextlost', onLoss);
   scene.traverse(object => { object.geometry?.dispose(); if (object.material) object.material.dispose(); });
   renderer.dispose(); renderer.domElement.remove(); container.classList.remove('webgl-ready');
  };
 }, [progress, motion]);
 return <div className="orbit-canvas" ref={host} aria-hidden="true"><div className="orbit-fallback"/></div>;
}
