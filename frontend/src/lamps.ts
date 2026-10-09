import {
  AdditiveBlending, AmbientLight, BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, DirectionalLight, DoubleSide,
  Group, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, PointLight, Scene, SphereGeometry, Sprite, SpriteMaterial,
  TorusGeometry, WebGLRenderer,
} from "three";

// The lamp models the room cards can draw; mirrors room_ws.LIGHT_STYLES.
export const LAMP_STYLES = [
  "bulb", "pendant", "spot", "ceiling", "downlight", "chandelier", "strip", "table", "floor", "wall",
  "lantern", "ground", "post",
] as const;
export type LampStyle = (typeof LAMP_STYLES)[number];
export const DEFAULT_STYLE: LampStyle = "bulb";

const SIZE = 192; // css px per lamp image; rendered at 2x
const WARM = 0xffc46b;

// One WebGL renderer for every lamp on the page (browsers cap live WebGL contexts at ~16):
// each style/state is rendered once to an image and cached, the tiles just show <img>.
let renderer: WebGLRenderer | null = null;
let webglFailed = false;
const cache = new Map<string, string>();

// Fallback when WebGL can't be created: a plain bulb whose glow follows the level.
const flatLamp = (level: number) =>
  "data:image/svg+xml," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="26" r="${12 + 10 * level}" fill="#ffc46b" opacity="${0.35 * level}"/>` +
    `<circle cx="32" cy="26" r="12" fill="${level ? "#fff1d0" : "#9a9a9a"}"/><rect x="26" y="38" width="12" height="10" rx="2" fill="#8a8f98"/></svg>`);

const body = new MeshStandardMaterial({ color: 0x8a8f98, metalness: 0.6, roughness: 0.35 });
const dark = new MeshStandardMaterial({ color: 0x43474e, metalness: 0.3, roughness: 0.55 });
const cord = new MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.8 });

let glowTexture: CanvasTexture | null = null;
function glow(): CanvasTexture {
  if (glowTexture) return glowTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,214,140,1)");
  grad.addColorStop(0.35, "rgba(255,190,100,.45)");
  grad.addColorStop(1, "rgba(255,170,60,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return (glowTexture = new CanvasTexture(c));
}

const mesh = (geo: any, mat: MeshStandardMaterial, [x, y, z] = [0, 0, 0]) => {
  const m = new Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
};

// A cone of light under (or, flipped, above) a fixture; lit with the level by lampImage().
function beam(radius: number, height: number, y: number, up = false) {
  const m = mesh(new ConeGeometry(radius, height, 32, 1, true), new MeshStandardMaterial({
    color: WARM, emissive: WARM, emissiveIntensity: 0.6, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide,
  }), [0, up ? y + height / 2 : y, 0]);
  if (up) m.rotation.x = Math.PI;
  m.name = "beam";
  return m;
}

// The emitting part of a lamp: its brightness follows the light's level.
function emitter(level: number) {
  return new MeshStandardMaterial({
    color: level ? 0xfff1d0 : 0xd9d9d9, emissive: WARM, emissiveIntensity: level * 2.2,
    roughness: 0.3, transparent: true, opacity: 0.95,
  });
}

// Each builder returns the lamp plus where its light comes from (for the glow and point light).
// A fabric shade lets light through: it glows faintly with the level.
const shade = (level: number) =>
  new MeshStandardMaterial({ color: 0xe9e3d6, emissive: WARM, emissiveIntensity: level * 0.55, roughness: 0.9, side: DoubleSide });

const BUILDERS: Record<LampStyle, (e: MeshStandardMaterial, level: number) => [Object3D, [number, number, number]]> = {
  bulb: (e) => {
    const g = new Group();
    g.add(mesh(new SphereGeometry(0.55, 32, 24), e, [0, 0.25, 0]));
    g.add(mesh(new CylinderGeometry(0.26, 0.22, 0.45, 24), body, [0, -0.45, 0]));
    g.add(mesh(new CylinderGeometry(0.12, 0.08, 0.15, 16), dark, [0, -0.73, 0]));
    return [g, [0, 0.25, 0]];
  },
  pendant: (e) => {
    const g = new Group();
    g.add(mesh(new CylinderGeometry(0.02, 0.02, 1.2, 8), cord, [0, 0.95, 0]));
    g.add(mesh(new ConeGeometry(0.85, 0.75, 40, 1, true), dark, [0, 0.0, 0]));
    g.add(mesh(new SphereGeometry(0.28, 24, 16), e, [0, -0.3, 0]));
    return [g, [0, -0.4, 0]];
  },
  spot: (e) => {
    const g = new Group();
    g.add(mesh(new CylinderGeometry(0.75, 0.75, 0.08, 40), body, [0, 0.45, 0]));
    g.add(mesh(new CylinderGeometry(0.45, 0.38, 0.35, 32), dark, [0, 0.25, 0]));
    g.add(mesh(new CylinderGeometry(0.3, 0.3, 0.04, 32), e, [0, 0.06, 0]));
    g.add(beam(0.9, 1.4, -0.65));
    return [g, [0, 0, 0]];
  },
  downlight: (e) => {
    const g = new Group();
    g.add(mesh(new BoxGeometry(2.2, 0.06, 1.2), new MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.95 }), [0, 0.55, 0])); // the ceiling
    g.add(mesh(new TorusGeometry(0.34, 0.05, 12, 40), body, [0, 0.5, 0]).rotateX(Math.PI / 2));
    g.add(mesh(new CylinderGeometry(0.3, 0.3, 0.03, 40), e, [0, 0.5, 0]));
    g.add(beam(0.8, 1.6, -0.3));
    return [g, [0, 0.45, 0]];
  },
  chandelier: (e) => {
    const g = new Group();
    g.add(mesh(new CylinderGeometry(0.02, 0.02, 0.8, 8), cord, [0, 0.75, 0]));
    g.add(mesh(new SphereGeometry(0.1, 16, 12), body, [0, 0.33, 0]));
    g.add(mesh(new TorusGeometry(0.7, 0.03, 8, 48), body, [0, 0.1, 0]).rotateX(Math.PI / 2));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const [x, z] = [Math.cos(a) * 0.7, Math.sin(a) * 0.7];
      g.add(mesh(new CylinderGeometry(0.06, 0.06, 0.14, 12), body, [x, 0.17, z]));
      g.add(mesh(new SphereGeometry(0.11, 16, 12), e, [x, 0.32, z]));
    }
    g.rotation.x = 0.35;
    return [g, [0, 0.3, 0]];
  },
  ceiling: (e) => {
    const g = new Group();
    g.add(mesh(new CylinderGeometry(0.95, 0.95, 0.08, 48), body, [0, 0.5, 0]));
    const dome = mesh(new SphereGeometry(0.85, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), e, [0, 0.46, 0]);
    dome.scale.set(1, -0.45, 1);
    g.add(dome);
    return [g, [0, 0.2, 0]];
  },
  strip: (e) => {
    const g = new Group();
    g.add(mesh(new BoxGeometry(2.0, 0.12, 0.3), dark, [0, -0.05, 0]));
    g.add(mesh(new BoxGeometry(1.9, 0.06, 0.2), e, [0, 0.05, 0]));
    g.rotation.z = 0.15;
    return [g, [0, 0.05, 0]];
  },
  table: (e, level) => {
    const g = new Group();
    g.add(mesh(new CylinderGeometry(0.4, 0.45, 0.1, 32), body, [0, -0.85, 0]));
    g.add(mesh(new CylinderGeometry(0.05, 0.05, 0.9, 12), body, [0, -0.35, 0]));
    g.add(mesh(new SphereGeometry(0.2, 20, 14), e, [0, 0.15, 0]));
    g.add(mesh(new CylinderGeometry(0.45, 0.7, 0.7, 40, 1, true), shade(level), [0, 0.3, 0]));
    return [g, [0, 0.2, 0]];
  },
  floor: (e, level) => {
    const g = new Group();
    g.add(mesh(new CylinderGeometry(0.35, 0.4, 0.06, 32), dark, [0, -1.05, 0]));
    g.add(mesh(new CylinderGeometry(0.035, 0.035, 1.6, 12), dark, [0, -0.25, 0]));
    g.add(mesh(new SphereGeometry(0.16, 20, 14), e, [0, 0.6, 0]));
    g.add(mesh(new CylinderGeometry(0.35, 0.55, 0.55, 40, 1, true), shade(level), [0, 0.75, 0]));
    return [g, [0, 0.65, 0]];
  },
  lantern: (e) => {
    const g = new Group();
    g.add(mesh(new BoxGeometry(0.4, 0.7, 0.06), dark, [0, 0.05, -0.5])); // wall plate
    g.add(mesh(new BoxGeometry(0.06, 0.06, 0.4), dark, [0, 0.25, -0.3]));
    g.add(mesh(new BoxGeometry(0.62, 0.85, 0.62), e, [0, -0.1, 0]));
    for (const [x, z] of [[-0.31, -0.31], [0.31, -0.31], [-0.31, 0.31], [0.31, 0.31]]) g.add(mesh(new BoxGeometry(0.05, 0.9, 0.05), dark, [x, -0.1, z]));
    g.add(mesh(new BoxGeometry(0.72, 0.06, 0.72), dark, [0, -0.55, 0]));
    g.add(mesh(new ConeGeometry(0.55, 0.35, 4), dark, [0, 0.5, 0]).rotateY(Math.PI / 4));
    g.rotation.y = 0.55;
    return [g, [0, -0.1, 0]];
  },
  ground: (e) => {
    const g = new Group();
    g.add(mesh(new CylinderGeometry(1.0, 1.0, 0.1, 48), new MeshStandardMaterial({ color: 0x4d5a3f, roughness: 1 }), [0, -0.9, 0])); // lawn
    g.add(mesh(new CylinderGeometry(0.42, 0.42, 0.06, 40), body, [0, -0.82, 0]));
    g.add(mesh(new CylinderGeometry(0.3, 0.3, 0.03, 40), e, [0, -0.78, 0]));
    g.add(beam(0.8, 1.6, -0.78, true)); // tip at the lens, widening upward
    g.rotation.x = 0.35;
    return [g, [0, -0.7, 0]];
  },
  post: (e) => {
    const g = new Group();
    g.add(mesh(new CylinderGeometry(0.3, 0.34, 0.08, 32), dark, [0, -1.0, 0]));
    g.add(mesh(new CylinderGeometry(0.22, 0.22, 1.5, 32), dark, [0, -0.25, 0]));
    g.add(mesh(new CylinderGeometry(0.21, 0.21, 0.35, 32), e, [0, 0.62, 0]));
    g.add(mesh(new CylinderGeometry(0.28, 0.28, 0.08, 32), dark, [0, 0.83, 0]));
    return [g, [0, 0.62, 0]];
  },
  wall: (e) => {
    const g = new Group();
    g.add(mesh(new BoxGeometry(0.5, 0.9, 0.08), body, [0, 0, -0.45]));
    g.add(mesh(new CylinderGeometry(0.05, 0.05, 0.4, 12), body, [0, 0, -0.25]).rotateX(Math.PI / 2));
    g.add(mesh(new TorusGeometry(0.32, 0.05, 12, 32), body, [0, 0, 0]).rotateX(Math.PI / 2));
    g.add(mesh(new SphereGeometry(0.3, 24, 16), e, [0, 0.05, 0]));
    g.rotation.y = 0.5;
    return [g, [0, 0.05, 0]];
  },
};

// level 0 = off, 1 = full; quantized so a dragged slider reuses cached frames.
export function lampImage(style: LampStyle, level: number): string {
  const q = Math.round(Math.max(0, Math.min(1, level)) * 10) / 10;
  const key = `${style}:${q}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (webglFailed) return flatLamp(q);
  if (!renderer) {
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch (e) {
      // WebGL disabled or unavailable (some WebViews): draw a flat lamp rather than break the panel.
      console.warn("Plejd panel: WebGL unavailable, using flat lamp icons", e);
      webglFailed = true;
      return flatLamp(q);
    }
    renderer.setPixelRatio(2);
    renderer.setSize(SIZE, SIZE, false);
  }
  const scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 0.9));
  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(2, 3, 4);
  scene.add(sun);

  const e = emitter(q);
  const [lamp, [lx, ly, lz]] = (BUILDERS[style] ?? BUILDERS[DEFAULT_STYLE])(e, q);
  scene.add(lamp);
  if (q) {
    const p = new PointLight(WARM, 6 * q, 4);
    p.position.set(lx, ly, lz + 0.2);
    lamp.add(p);
    const halo = new Sprite(new SpriteMaterial({ map: glow(), blending: AdditiveBlending, depthWrite: false, opacity: 0.35 + 0.65 * q }));
    halo.position.set(lx, ly, lz);
    halo.scale.setScalar(1.2 + 1.6 * q);
    lamp.add(halo);
    const beam = lamp.getObjectByName("beam") as Mesh | undefined;
    if (beam) (beam.material as MeshStandardMaterial).opacity = 0.25 * q;
  }

  const camera = new PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0.5, 4.6);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  cache.set(key, url);
  const shared = [body, dark, cord];
  scene.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      if (!shared.includes(o.material)) o.material.dispose();
    } else if (o instanceof Sprite) o.material.dispose();
  });
  return url;
}
