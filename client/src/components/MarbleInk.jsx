import { useEffect, useRef } from "react";

// The marbled ink from Byline's cover, drawn live: value noise warped by itself twice, run through
// sine bands and cut into hard edges. Same hash, seed and colours as the cover, with time added.

const VERTEX = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform float uHeight;
uniform float uDensity;
uniform float uTime;
out vec4 outColor;

const float PI = 3.14159265;

float hash(ivec2 c) {
  uint h = uint(c.x) * 374761393u + uint(c.y) * 668265263u + 6822438u;
  h = (h ^ (h >> 13)) * 1274126177u;
  return float(h ^ (h >> 16)) / 4294967295.0;
}

float noise(vec2 p) {
  ivec2 c = ivec2(floor(p));
  vec2 f = fract(p);
  vec2 s = f * f * (3.0 - 2.0 * f);
  float a = hash(c), b = hash(c + ivec2(1, 0)), d = hash(c + ivec2(0, 1)), e = hash(c + ivec2(1, 1));
  return a + (b - a) * s.x + (d - a) * s.y + (a - b - d + e) * s.x * s.y;
}

float fbm(vec2 p) {
  float sum = 0.0, amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec2(11.7, 4.1);
    amp *= 0.5;
  }
  return sum;
}

vec3 paint(float t) {
  float w = max(0.006, fwidth(t) * 0.75);
  vec3 deep = vec3(16.0, 112.0, 64.0) / 255.0;
  vec3 mid = vec3(34.0, 170.0, 94.0) / 255.0;
  vec3 bright = vec3(110.0, 235.0, 131.0) / 255.0;
  vec3 pale = vec3(238.0, 247.0, 240.0) / 255.0;
  vec3 c = deep;
  c = mix(c, mid, smoothstep(0.14 - w, 0.14 + w, t));
  c = mix(c, bright, smoothstep(0.30 - w, 0.30 + w, t));
  c = mix(c, pale, smoothstep(0.50 - w, 0.50 + w, t));
  c = mix(c, bright, smoothstep(0.60 - w, 0.60 + w, t));
  c = mix(c, mid, smoothstep(0.68 - w, 0.68 + w, t));
  c = mix(c, deep, smoothstep(0.84 - w, 0.84 + w, t));
  return c;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uHeight - gl_FragCoord.y) / uDensity;
  vec2 drift = uTime * vec2(0.0035, -0.0022);
  vec2 q = vec2(fbm(p + drift), fbm(p + vec2(5.2, 1.3) - drift));
  float r = fbm(p + 3.2 * q + vec2(1.7, 9.2) + drift.yx);
  float wave = sin((p.x * 0.55 + p.y * 1.1 + 3.0 * r + 1.4 * q.x) * PI * 3.4 - uTime * 0.1);
  outColor = vec4(paint(wave * 0.5 + 0.5), 1.0);
}`;

// One unit of noise spans this many CSS pixels, which sets the width of the bands.
const CSS_PX_PER_UNIT = 500;
// The bands move 3 to 7px a second, so 30 frames look the same as 60 at half the work.
const FRAME_MS = 1000 / 30;
const MAX_PIXEL_RATIO = 1.5;
// Where a reduced-motion visitor's still sits on the clock.
const STILL_TIME = 40;

function compile(gl) {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, VERTEX],
    [gl.FRAGMENT_SHADER, FRAGMENT],
  ]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  console.error("MarbleInk:", gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

export default function MarbleInk() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    // Without WebGL2 the canvas stays clear and the panel shows its plain green.
    if (!gl) return;

    let program = null;
    let uniforms = null;
    let frame = 0;
    let lastDraw = -Infinity;
    let onScreen = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const setup = () => {
      program = compile(gl);
      if (!program) return;
      gl.useProgram(program);
      gl.bindVertexArray(gl.createVertexArray());
      uniforms = {
        height: gl.getUniformLocation(program, "uHeight"),
        density: gl.getUniformLocation(program, "uDensity"),
        time: gl.getUniformLocation(program, "uTime"),
      };
    };

    const draw = (seconds) => {
      if (!program) return;
      gl.uniform1f(uniforms.time, seconds);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const tick = (now) => {
      frame = requestAnimationFrame(tick);
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      draw(now / 1000);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const refresh = () => {
      stop();
      if (!onScreen) return;
      if (reducedMotion.matches) draw(STILL_TIME);
      else frame = requestAnimationFrame(tick);
    };

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height || !program) return;
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uniforms.height, canvas.height);
      gl.uniform1f(uniforms.density, CSS_PX_PER_UNIT * ratio);
      // Changing a canvas's size clears it, so paint again without waiting for the next frame.
      draw(reducedMotion.matches ? STILL_TIME : performance.now() / 1000);
    };

    const onContextLost = (event) => {
      event.preventDefault();
      stop();
      program = null;
    };
    const onContextRestored = () => {
      setup();
      resize();
      refresh();
    };

    setup();

    // The panel is hidden below the lg breakpoint, and nothing should run for a panel nobody sees.
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      refresh();
    });
    const size = new ResizeObserver(resize);
    visibility.observe(canvas);
    size.observe(canvas);
    reducedMotion.addEventListener("change", refresh);
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);

    return () => {
      stop();
      visibility.disconnect();
      size.disconnect();
      reducedMotion.removeEventListener("change", refresh);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      if (program) gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute h-full w-full bg-[#22aa5e]"
    />
  );
}
