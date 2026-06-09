import * as THREE from "three";

const VIDEO_SOURCES = {
  front: "videos/maquettes/04.m4v",
  back: "videos/maquettes/05.m4v",
  left: "videos/maquettes/01.m4v",
  right: "videos/maquettes/06.m4v",
  top: "videos/maquettes/03.m4v",
  bottom: "videos/maquettes/07.m4v",
};

const SPHERE_VERTEX = /* glsl */ `
  varying vec3 vWorldNormal;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SPHERE_FRAGMENT = /* glsl */ `
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform sampler2D uLeft;
  uniform sampler2D uRight;
  uniform sampler2D uTop;
  uniform sampler2D uBottom;

  varying vec3 vWorldNormal;

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 absN = abs(n);
    vec2 uv;
    vec4 color;

    if (absN.x >= absN.y && absN.x >= absN.z) {
      uv = vec2(
        n.x > 0.0 ? -n.z / absN.x : n.z / absN.x,
        -n.y / absN.x
      );
      uv = uv * 0.5 + 0.5;
      color = n.x > 0.0 ? texture2D(uRight, uv) : texture2D(uLeft, uv);
    } else if (absN.y >= absN.z) {
      uv = vec2(
        n.x / absN.y,
        n.y > 0.0 ? n.z / absN.y : -n.z / absN.y
      );
      uv = uv * 0.5 + 0.5;
      color = n.y > 0.0 ? texture2D(uTop, uv) : texture2D(uBottom, uv);
    } else {
      uv = vec2(
        n.z > 0.0 ? n.x / absN.z : -n.x / absN.z,
        -n.y / absN.z
      );
      uv = uv * 0.5 + 0.5;
      color = n.z > 0.0 ? texture2D(uFront, uv) : texture2D(uBack, uv);
    }

    gl_FragColor = color;
  }
`;

function getSphereSizePx() {
  const size = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--info-sphere-size")
  );
  return Number.isFinite(size) && size > 0 ? size : 168;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createVideoElement(src) {
  const video = document.createElement("video");
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.setAttribute("disablepictureinpicture", "");
  video.preload = "metadata";
  video.src = src;
  video.style.cssText =
    "position:fixed;width:0;height:0;opacity:0;pointer-events:none;left:-9999px";
  document.body.appendChild(video);
  return video;
}

function initInfoSphere() {
  const wrap = document.getElementById("infoSphereWrap");
  const canvas = document.getElementById("infoSphereCanvas");

  if (!wrap || !canvas) return;

  function bindVideoPlayback(playFn, pauseFn) {
    const section = document.getElementById("section-info");
    if (!section || !("IntersectionObserver" in window)) {
      playFn();
      return;
    }

    const scrollRoot = document.getElementById("siteScroller");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.15) playFn();
          else pauseFn();
        });
      },
      { root: scrollRoot || null, threshold: [0, 0.15, 0.35] }
    );
    observer.observe(section);
  }

  if (prefersReducedMotion()) return;

  const videos = {
    front: createVideoElement(VIDEO_SOURCES.front),
    back: createVideoElement(VIDEO_SOURCES.back),
    left: createVideoElement(VIDEO_SOURCES.left),
    right: createVideoElement(VIDEO_SOURCES.right),
    top: createVideoElement(VIDEO_SOURCES.top),
    bottom: createVideoElement(VIDEO_SOURCES.bottom),
  };

  const textures = Object.fromEntries(
    Object.entries(videos).map(([key, video]) => [
      key,
      new THREE.VideoTexture(video),
    ])
  );

  Object.values(textures).forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  });

  function playVideos() {
    Object.values(videos).forEach((video) => {
      video.play().catch(() => {});
    });
  }

  function pauseVideos() {
    Object.values(videos).forEach((video) => video.pause());
  }

  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.08, 3.15);

  const geometry = new THREE.SphereGeometry(1, 96, 96);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uFront: { value: textures.front },
      uBack: { value: textures.back },
      uLeft: { value: textures.left },
      uRight: { value: textures.right },
      uTop: { value: textures.top },
      uBottom: { value: textures.bottom },
    },
    vertexShader: SPHERE_VERTEX,
    fragmentShader: SPHERE_FRAGMENT,
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.rotation.x = -0.28;
  sphere.rotation.y = 0.62;
  scene.add(sphere);

  let rotX = sphere.rotation.x;
  let rotY = sphere.rotation.y;
  let dragging = false;
  let pointerId = null;
  let lastX = 0;
  let lastY = 0;
  let velX = 0;
  let velY = 0;
  let inertiaFrame = 0;
  let renderFrame = 0;

  const clampX = (value) => Math.max(-1.2, Math.min(1.2, value));

  function applyRotation() {
    sphere.rotation.x = rotX;
    sphere.rotation.y = rotY;
  }

  function stopInertia() {
    if (inertiaFrame) {
      cancelAnimationFrame(inertiaFrame);
      inertiaFrame = 0;
    }
  }

  function startInertia() {
    stopInertia();

    const step = () => {
      velX *= 0.94;
      velY *= 0.94;

      if (Math.abs(velX) < 0.001 && Math.abs(velY) < 0.001) {
        inertiaFrame = 0;
        return;
      }

      rotY += velY;
      rotX = clampX(rotX + velX);
      applyRotation();
      inertiaFrame = requestAnimationFrame(step);
    };

    inertiaFrame = requestAnimationFrame(step);
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;

    dragging = true;
    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    velX = 0;
    velY = 0;
    stopInertia();

    wrap.classList.add("is-dragging");
    wrap.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (!dragging || event.pointerId !== pointerId) return;

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;

    lastX = event.clientX;
    lastY = event.clientY;

    rotY += dx * 0.008;
    rotX = clampX(rotX - dy * 0.008);
    velX = -dy * 0.002;
    velY = dx * 0.002;

    applyRotation();
    event.preventDefault();
  }

  function onPointerUp(event) {
    if (!dragging || event.pointerId !== pointerId) return;

    dragging = false;
    pointerId = null;
    wrap.classList.remove("is-dragging");

    if (wrap.hasPointerCapture(event.pointerId)) {
      wrap.releasePointerCapture(event.pointerId);
    }

    startInertia();
  }

  function resize() {
    const size = getSphereSizePx();

    renderer.setSize(size, size, false);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  function render() {
    renderFrame = requestAnimationFrame(render);
    renderer.render(scene, camera);
  }

  resize();
  render();

  wrap.addEventListener("pointerdown", onPointerDown);
  wrap.addEventListener("pointermove", onPointerMove);
  wrap.addEventListener("pointerup", onPointerUp);
  wrap.addEventListener("pointercancel", onPointerUp);

  wrap.addEventListener("touchstart", (event) => event.preventDefault(), {
    passive: false,
  });
  wrap.addEventListener("touchmove", (event) => event.preventDefault(), {
    passive: false,
  });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(wrap);

  window.addEventListener("resize", resize);
  window.addEventListener("info-sphere-resize", resize);

  bindVideoPlayback(playVideos, pauseVideos);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(renderFrame);
      renderFrame = 0;
      stopInertia();
      pauseVideos();
    } else if (!renderFrame) {
      render();
      const section = document.getElementById("section-info");
      if (section) {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) playVideos();
      }
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInfoSphere);
} else {
  initInfoSphere();
}
