import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export function useOrbitControls() {
 const [selected, setSelected] = useState(null);
 const motion = useRef({ openIndex: null, hover: false, drag: 0, tilt: 0, pointerX: 0, pointerY: 0, dragging: false });
 motion.current.openIndex = selected;
 const select = useCallback(index => setSelected(index), []);
 const close = useCallback(() => setSelected(null), []);
 useEffect(() => () => document.documentElement.classList.remove('orbit-pointer-active'), []);
 function hover(value) {
  motion.current.hover = value;
  document.documentElement.classList.toggle('orbit-pointer-active', value);
 }
 const dragProps = {
  onPointerEnter: () => hover(true),
  onPointerLeave: () => { if (!motion.current.dragging) hover(false); },
  onPointerDown: event => {
   if (event.button !== 0) return;
   const state = motion.current;
   state.dragging = true; state.startX = state.lastX = event.clientX; state.startY = state.lastY = event.clientY; state.wasDragged = false;
   event.currentTarget.setPointerCapture(event.pointerId);
  },
  onPointerMove: event => {
   const state = motion.current;
   state.pointerX = event.clientX / window.innerWidth * 2 - 1;
   state.pointerY = event.clientY / window.innerHeight * 2 - 1;
   document.documentElement.style.setProperty('--orbit-cursor-x', `${event.clientX}px`);
   document.documentElement.style.setProperty('--orbit-cursor-y', `${event.clientY}px`);
   if (state.dragging) {
    state.drag += (event.clientX - state.lastX) * .008; state.tilt += (event.clientY - state.lastY) * .004;
    state.lastX = event.clientX; state.lastY = event.clientY;
    state.wasDragged = Math.hypot(event.clientX - state.startX, event.clientY - state.startY) > 6;
   }
  },
  onPointerUp: event => {
   motion.current.dragging = false;
   if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  },
  onPointerCancel: () => { motion.current.dragging = false; motion.current.wasDragged = true; hover(false); },
  onKeyDown: event => {
   if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
    event.preventDefault();
    motion.current.drag += event.key === 'ArrowLeft' ? -.2 : event.key === 'ArrowRight' ? .2 : 0;
    motion.current.tilt += event.key === 'ArrowUp' ? -.15 : event.key === 'ArrowDown' ? .15 : 0;
   }
  }
 };
 function activate(index) {
  if (motion.current.wasDragged) { motion.current.wasDragged = false; return; }
  hover(false); select(index);
 }
 return { selected, motion, select, close, dragProps, activate };
}
export function OrbitCursor({ expanded = false }) {
 return <span className="orbit-cursor" aria-hidden="true"><span>{expanded ? 'Drag' : 'Explore'} <b>{expanded ? '↔' : '↗'}</b></span></span>;
}
export function OrbitDetail({ controls, chapters }) {
 const dialog = useRef(null);
 const { selected, close, select, dragProps, motion } = controls;
 const open = selected !== null;
 useEffect(() => {
  if (!open) return;
  const element = dialog.current, previousOverflow = document.body.style.overflow;
  element.showModal(); document.body.style.overflow = 'hidden';
  document.documentElement.classList.add('orbit-detail-open');
  element.querySelector('[aria-label="Close skill details"]').focus({preventScroll:true});
  return () => { element.close(); document.body.style.overflow = previousOverflow; document.documentElement.classList.remove('orbit-pointer-active','orbit-detail-open'); };
 }, [open]);
 const item = chapters[selected || 0];
 return <dialog ref={dialog} className="orbit-detail" data-tone={selected} aria-labelledby="orbit-detail-title" onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
  <button className="detail-rotate" {...dragProps} aria-label={`Rotate ${item.name} planet. Drag or use arrow keys.`} onClick={() => { motion.current.wasDragged = false; }}><span className="sr-only">Drag to rotate the opened planet</span></button>
  <div className="orbit-detail-panel">
   <div className="orbit-detail-top"><span>THE TASKY CONSTELLATION</span><button autoFocus onClick={close} aria-label="Close skill details">Close ×</button></div>
   <p className="scene-kicker">0{(selected || 0) + 1} / 04 · INDEPENDENT TALENT</p>
   <h2 id="orbit-detail-title">{item.name}</h2><p>{item.description}</p>
   <Link className="button" to={item.link} onClick={close}>{item.action} ↗</Link>
   <div className="orbit-detail-bottom"><button onClick={close}>← Back to orbit</button><button onClick={() => select(((selected || 0) + 1) % chapters.length)}>Next skill →</button></div>
  </div><p className="detail-caption">0{(selected || 0) + 1} / {item.name}<small>DRAG TO ROTATE · USE ARROW KEYS · ESC TO CLOSE</small></p><OrbitCursor expanded/>
 </dialog>;
}
