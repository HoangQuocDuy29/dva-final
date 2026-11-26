import React, { useEffect, useRef, useState } from 'react';

export interface RippleOrigin { x: number; y: number }
interface WaterRippleRevealProps { origin: RippleOrigin | null; onComplete: () => void }

const VERT = `attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.,1.);}`;
const FRAG = `precision highp float;
uniform vec2 u_origin;uniform float u_progress,u_maxR,u_dpr;
void main(){
  vec2 diff=gl_FragCoord.xy-u_origin;float d=length(diff);
  vec2 dir=d>0.001?diff/d:vec2(1.,0.);float R=u_progress*u_maxR*1.12,delta=d-R;
  float band=max(95.*u_dpr,u_maxR*0.16),k=0.11/u_dpr,p=u_progress*14.;
  float w1=sin(delta*k-p)*exp(-abs(delta)/(band*0.55));
  float w2=0.55*sin(delta*k*1.85-p*1.4+1.2)*exp(-abs(delta-band*0.2)/(band*0.42));
  float w3=0.3*sin(delta*k*3.1-p*1.9+2.4)*exp(-abs(delta+band*0.18)/(band*0.32));
  float ang=atan(dir.y,dir.x),caustic=0.5+0.5*sin(ang*9.+delta*k*0.6-p*1.2);
  vec3 N=normalize(vec3(dir*(w1+w2+w3)*0.95,1.)),L=normalize(vec3(-0.35,0.45,0.82));
  float spec=pow(max(dot(N,L),0.),22.)*(0.65+0.55*caustic),fresnel=pow(1.-clamp(N.z,0.,1.),1.6);
  vec3 tint=mix(vec3(0.88,0.11,0.28),vec3(0.98,0.45,0.09),0.5+0.5*sin(ang*3.+u_progress*5.));
  float fade=1.-smoothstep(0.82,1.,u_progress),veil=smoothstep(-band*0.28,band*0.42,delta)*fade;
  float crest=smoothstep(band*1.05,0.,abs(delta))*fade;
  vec3 col=mix(vec3(0.043,0.051,0.071),tint*(0.85+0.5*fresnel)+vec3(1.,0.95,0.9)*spec*1.4,clamp(crest*(0.55+spec+fresnel),0.,1.));
  gl_FragColor=vec4(col,clamp(max(veil*0.92,crest*(0.52+spec*0.65+fresnel*0.45)),0.,1.));
}`;

export const WaterRippleReveal: React.FC<WaterRippleRevealProps> = ({ origin, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onComplete);
  doneRef.current = onComplete;
  const [fallback, setFallback] = useState<{ maxR: number; active: boolean } | null>(null);

  useEffect(() => {
    if (!origin) { setFallback(null); return undefined; }
    const w = window.innerWidth, h = window.innerHeight;
    const maxR = Math.hypot(Math.max(origin.x, w - origin.x), Math.max(origin.y, h - origin.y));
    const runFallback = () => {
      setFallback({ maxR, active: false });
      const r = requestAnimationFrame(() => setFallback({ maxR, active: true }));
      const t = window.setTimeout(() => { setFallback(null); doneRef.current(); }, 460);
      return () => { cancelAnimationFrame(r); clearTimeout(t); };
    };
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    const gl = !reduced && canvas ? canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true }) : null;
    if (!gl || !canvas) return runFallback();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl.getExtension('WEBGL_lose_context')?.loseContext(); return runFallback(); }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform2f(gl.getUniformLocation(prog, 'u_origin'), origin.x * dpr, (h - origin.y) * dpr);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_maxR'), maxR * dpr);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_dpr'), dpr);
    const uProg = gl.getUniformLocation(prog, 'u_progress');

    let rafId = 0, start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / 700);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uProg, 1 - Math.pow(1 - t, 3));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (t < 1) { rafId = requestAnimationFrame(tick); return; }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      doneRef.current();
    };
    rafId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafId); gl.getExtension('WEBGL_lose_context')?.loseContext(); };
  }, [origin]);

  if (!origin) return null;
  if (fallback) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[9999] pointer-events-none bg-gradient-to-br from-orange-500/35 via-rose-600/30 to-[#0B0D12]"
        style={{ clipPath: `circle(${fallback.active ? fallback.maxR : 0}px at ${origin.x}px ${origin.y}px)`, opacity: fallback.active ? 0 : 0.92, transition: 'clip-path 450ms cubic-bezier(0.22,1,0.36,1), opacity 450ms ease-out' }}
      />
    );
  }
  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 z-[9999] pointer-events-none w-full h-full" />;
};
