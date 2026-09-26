import * as THREE from 'three';
import type { Ink } from './ink';
import { INSET, INSET_BEFORE, INSET_SECTION } from '../unit/layout';
import { frameIn, type Box, type Inset } from '../unit/frame';

/** Renderer + orthographic camera: frames a box of drawing units into the free part of the viewport and draws on demand. */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  /** Screen px per drawing unit and the camera centre, from the last `frame`. */
  s = 1; cx = 0; cy = 0;
  W = 1; H = 1;
  private shots: Box[] = [];

  constructor(readonly el: HTMLElement, private ink: Ink) {
    // preserveDrawingBuffer: an idle canvas is otherwise captured white in the sheet change's outgoing snapshot
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    this.renderer.setClearColor(ink.theme.paper);
    el.appendChild(this.renderer.domElement);
    this.camera.position.z = 50;
    this.scene.add(this.camera);
    this.scene.matrixWorldAutoUpdate = false;
  }

  /** The chrome the frame keeps clear: the caption and bar once the player is live, only the top before Begin. */
  private inset(): Inset { const c = document.body.classList; return !c.contains('live') ? INSET_BEFORE : c.contains('in-section') ? INSET_SECTION : INSET; }

  /** The framings the unit will use; text is rasterised for the tightest one. */
  setShots(shots: Box[]): void { this.shots = shots; }

  resize(): void {
    this.W = Math.max(1, this.el.clientWidth); this.H = Math.max(1, this.el.clientHeight);
    this.renderer.setSize(this.W, this.H, false);
    const k = Math.max(1, ...this.shots.map((b) => frameIn(b, this.W, this.H, this.inset()).s)) * this.renderer.getPixelRatio();
    this.ink.raster(Math.min(6, k));
  }

  /** Frame box b (drawing units) into the viewport minus the chrome insets, never past the sheet's side edges. */
  frame(b: Box): void {
    const { s, cx, cy, view } = frameIn(b, this.W, this.H, this.inset()), c = this.camera;
    this.s = s; this.cx = cx; this.cy = cy;
    [c.left, c.bottom, c.right, c.top] = view;
    c.updateProjectionMatrix();
    this.ink.setPx(s);
  }
  /** Visible width and height in drawing units. */
  span(): [number, number] { return [this.W / this.s, this.H / this.s]; }
  toScreen(x: number, y: number): [number, number] { return [(x - this.cx) * this.s + this.W / 2, this.H / 2 - (y - this.cy) * this.s]; }
  toWorld(px: number, py: number): [number, number] { return [(px - this.W / 2) / this.s + this.cx, (this.H / 2 - py) / this.s + this.cy]; }
  render(): void { updateShown(this.scene); this.renderer.render(this.scene, this.camera); }
}

/** Three's matrix update (`updateMatrixWorld`) over drawn subtrees only: a hidden one is neither drawn nor read, so it catches up when shown. */
function updateShown(o: THREE.Object3D, force = false): void {
  if (!o.visible) return;
  if (o.updateMatrixWorld !== THREE.Object3D.prototype.updateMatrixWorld) return o.updateMatrixWorld(force);
  if (o.matrixAutoUpdate) o.updateMatrix();
  if (o.matrixWorldNeedsUpdate || force) {
    if (o.matrixWorldAutoUpdate) { if (o.parent) o.matrixWorld.multiplyMatrices(o.parent.matrixWorld, o.matrix); else o.matrixWorld.copy(o.matrix); }
    o.matrixWorldNeedsUpdate = false;
    force = true;
  }
  for (const c of o.children) updateShown(c, force);
}
