'use strict';
const $ = (id) => document.getElementById(id);
const OPT = [5.17176466, 1.60446794, 0.56221445];
const PRESETS = {
  opt: OPT,
  a: [4.0364, 1.3192, 0.0603],
  b: [1.345, 3.597, 0.588],
  c: [1, 0.502, 0.0603],
  zero: [0, 0, 0],
};
const H = [
  [0.01211804, -0.01537723, -0.01250085],
  [-0.01537723, 0.059502, 0.00930569],
  [-0.01250085, 0.00930569, 0.06570305],
];
const GOPT = [-1.05643272e-6, 3.51693671e-6, 1.96506897e-6];
const fmt = (v, d = 3) => (Number.isFinite(v) ? (+v).toFixed(d) : '—');
const norm = (v) => Math.sqrt(v.reduce((a, b) => a + b * b, 0));
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const sigmoid = (s) =>
  s >= 0 ? 1 / (1 + Math.exp(-s)) : Math.exp(s) / (1 + Math.exp(s));
const softplus = (s) => Math.max(s, 0) + Math.log1p(Math.exp(-Math.abs(s)));
const bceLogit = (s, t) => softplus(s) - t * s;
const qloss = (s, t) => Math.pow(sigmoid(s) - t, 2);
const on = (id, type, fn) => $(id).addEventListener(type, fn);
const getSlider = (id) => Number($(id).value);
const chartFont = getComputedStyle(document.documentElement)
  .getPropertyValue('--font-sans')
  .trim();
function setSelected(button, selected, className = 'primary') {
  button.classList.toggle(className, selected);
  button.setAttribute('aria-pressed', String(selected));
}
function ctxCanvas(id) {
  const c = $(id),
    cw = c.clientWidth,
    ch = c.clientHeight,
    ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (
    c.width !== Math.round(cw * ratio) ||
    c.height !== Math.round(ch * ratio)
  ) {
    c.width = Math.round(cw * ratio);
    c.height = Math.round(ch * ratio);
  }
  const ctx = c.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  return { ctx, w: cw, h: ch };
}
function layout(w, h, yTitle = false) {
  return { l: yTitle ? 64 : 49, r: 20, t: 21, b: 36, w, h, yTitle };
}
function mapper(p, x0, x1, y0, y1) {
  return {
    x: (v) => p.l + ((v - x0) / (x1 - x0)) * (p.w - p.l - p.r),
    y: (v) => p.h - p.b - ((v - y0) / (y1 - y0)) * (p.h - p.t - p.b),
    px0: p.l,
    px1: p.w - p.r,
    py0: p.t,
    py1: p.h - p.b,
  };
}
function axes(ctx, p, m, xmin, xmax, ymin, ymax, xt = 4, yt = 4) {
  ctx.save();
  ctx.font = `12px ${chartFont}`;
  ctx.fillStyle = '#53647d';
  ctx.strokeStyle = '#e8edf5';
  ctx.lineWidth = 1;
  for (let i = 0; i <= xt; i++) {
    const val = xmin + ((xmax - xmin) * i) / xt,
      x = m.x(val);
    ctx.beginPath();
    ctx.moveTo(x, p.t);
    ctx.lineTo(x, p.h - p.b);
    ctx.stroke();
    ctx.fillText(fmt(val, 1), Math.max(0, x - 12), p.h - 16);
  }
  for (let j = 0; j <= yt; j++) {
    const val = ymin + ((ymax - ymin) * j) / yt,
      y = m.y(val);
    ctx.beginPath();
    ctx.moveTo(p.l, y);
    ctx.lineTo(p.w - p.r, y);
    ctx.stroke();
    ctx.fillText(fmt(val, 1), p.yTitle ? 22 : 6, y + 4);
  }
  ctx.strokeStyle = '#9cacbe';
  ctx.strokeRect(p.l, p.t, p.w - p.l - p.r, p.h - p.t - p.b);
  ctx.restore();
}
function curve(ctx, m, f, xmin, xmax, color, width = 2.5) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let i = 0; i <= 360; i++) {
    let x = xmin + ((xmax - xmin) * i) / 360,
      px = m.x(x),
      py = m.y(f(x));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}
function point(ctx, x, y, color, size = 5, stroke = true) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}
function textAt(ctx, str, x, y, color = '#203551', size = 12) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px ${chartFont}`;
  ctx.fillText(str, x, y);
  ctx.restore();
}
function drawArrow(ctx, x1, y1, x2, y2, color = '#e27b31') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - 10 * Math.cos(angle - 0.48),
    y2 - 10 * Math.sin(angle - 0.48),
  );
  ctx.lineTo(
    x2 - 10 * Math.cos(angle + 0.48),
    y2 - 10 * Math.sin(angle + 0.48),
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Dot-product laboratory: a synthetic example evaluated with the notebook's real w*.
function updateDot() {
  const x1 = getSlider('vx1'),
    x2 = getSlider('vx2'),
    s = OPT[0] * x1 + OPT[1] * x2 + OPT[2];
  $('vx1o').textContent = fmt(x1, 2);
  $('vx2o').textContent = fmt(x2, 2);
  $('dotstep').textContent =
    `(${fmt(OPT[0], 4)} × ${fmt(x1, 2)}) + (${fmt(OPT[1], 4)} × ${fmt(x2, 2)}) + ${fmt(OPT[2], 4)} = ${fmt(s, 5)}`;
  $('dotS').textContent = fmt(s, 4);
  $('dotP').textContent = fmt(sigmoid(s) * 100, 2) + '%';
  $('dotY').textContent = s >= 0 ? '1' : '0';
}
on('vx1', 'input', updateDot);
on('vx2', 'input', updateDot);

// Fixed seeded illustrative dataset. Not the original CSV.
let seed = 270518;
function rng() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}
const TOY = [];
for (let i = 0; i < 90; i++) {
  const x1 = -2.3 + 5.5 * rng(),
    x2 = -2.4 + 5.6 * rng();
  const s = 2.0 * x1 + 0.72 * x2 - 0.2;
  const t = rng() < sigmoid(s) ? 1 : 0;
  TOY.push({ x1, x2, t });
}
let boundaryWeights = [...OPT];
function getBoundaryW() {
  return boundaryWeights;
}
function updateBoundary() {
  const w = getBoundaryW();
  ['w1', 'w2', 'w3'].forEach(
    (id, i) => ($(id + 'o').textContent = fmt(w[i], 2)),
  );
  $('slope').textContent =
    Math.abs(w[1]) > 1e-10
      ? fmt(-w[0] / w[1], 3)
      : w[0] !== 0
        ? 'vertical'
        : '—';
  $('intercept').textContent =
    Math.abs(w[1]) > 1e-10 ? fmt(-w[2] / w[1], 3) : '—';
  $('exampleP').textContent =
    fmt(100 * sigmoid(dot(w, [0.7, -0.8, 1])), 1) + '%';
  $('boundaryNote').textContent =
    norm(w.slice(0, 2)) < 0.00001
      ? w[2] === 0
        ? 'At w = 0 every example has s = 0 and probability 0.5. The notebook breaks ties in favor of class 1; there is no unique line.'
        : 'With both feature weights at zero, every observation receives the same probability. There is no decision boundary.'
      : 'Moving w₃ translates the boundary. Changing the ratio w₁/w₂ rotates its slope; scaling all three coefficients by the same positive factor preserves the line but changes probability confidence.';
  drawBoundary();
}
function drawBoundary() {
  const { ctx, w: W, h: Ht } = ctxCanvas('boundaryChart'),
    p = layout(W, Ht, true),
    xmin = -2.5,
    xmax = 3.8,
    ymin = -2.7,
    ymax = 3.5,
    m = mapper(p, xmin, xmax, ymin, ymax),
    w = getBoundaryW();
  const left = p.l,
    right = W - p.r,
    top = p.t,
    bottom = Ht - p.b;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, right - left, bottom - top);
  ctx.clip();
  const gridStep = 7;
  for (let px = left; px < right; px += gridStep) {
    for (let py = top; py < bottom; py += gridStep) {
      let x = xmin + ((px - left) / (right - left)) * (xmax - xmin),
        y = ymax - ((py - top) / (bottom - top)) * (ymax - ymin);
      ctx.fillStyle = dot(w, [x, y, 1]) >= 0 ? '#fff2f3' : '#edf9f5';
      ctx.fillRect(px, py, gridStep + 1, gridStep + 1);
    }
  }
  ctx.restore();
  axes(ctx, p, m, xmin, xmax, ymin, ymax, 6, 6);
  if (norm(w.slice(0, 2)) > 1e-9) {
    ctx.save();
    ctx.strokeStyle = '#192d51';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();
    ctx.beginPath();
    if (Math.abs(w[1]) > 1e-9) {
      ctx.moveTo(m.x(xmin), m.y((-w[0] * xmin - w[2]) / w[1]));
      ctx.lineTo(m.x(xmax), m.y((-w[0] * xmax - w[2]) / w[1]));
    } else {
      let x = -w[2] / w[0];
      ctx.moveTo(m.x(x), top);
      ctx.lineTo(m.x(x), bottom);
    }
    ctx.stroke();
    ctx.restore();
  }
  for (const x of TOY) {
    point(ctx, m.x(x.x1), m.y(x.x2), x.t ? '#c74654' : '#16856b', 2.9, false);
  }
  point(ctx, m.x(0.7), m.y(-0.8), '#315cf4', 6, true);
  textAt(
    ctx,
    'x₁ = radius_mean',
    Math.max(70, (left + right) / 2 - 70),
    Ht - 4,
  );
  ctx.save();
  ctx.translate(13, Math.max(140, (top + bottom) / 2 + 60));
  ctx.rotate(-Math.PI / 2);
  textAt(ctx, 'x₂ = smoothness_mean', 0, 0);
  ctx.restore();
}
['w1', 'w2', 'w3'].forEach((id, index) =>
  on(id, 'input', () => {
    boundaryWeights[index] = getSlider(id);
    document
      .querySelectorAll('[data-preset]')
      .forEach((button) => setSelected(button, false));
    updateBoundary();
  }),
);
for (const b of document.querySelectorAll('[data-preset]'))
  b.addEventListener('click', () => {
    boundaryWeights = [...PRESETS[b.dataset.preset]];
    ['w1', 'w2', 'w3'].forEach((id, i) => ($(id).value = boundaryWeights[i]));
    document
      .querySelectorAll('[data-preset]')
      .forEach((x) => setSelected(x, x === b));
    updateBoundary();
  });

// Sigmoid, BCE and MSE experiment.
function updateLoss() {
  const s = getSlider('logit'),
    t = Number($('labelt').value),
    pr = sigmoid(s),
    a = bceLogit(s, t),
    b = qloss(s, t);
  $('logito').textContent = fmt(s, 2);
  $('prob').textContent = fmt(pr, 4);
  $('bceloss').textContent = fmt(a, 4);
  $('mseloss').textContent = fmt(b, 4);
  $('lossexplain').textContent =
    t === 1
      ? `Actual class 1: BCE = −log(p) = ${fmt(a, 4)}. A low predicted probability is strongly penalized.`
      : `Actual class 0: BCE = −log(1−p) = ${fmt(a, 4)}. A high probability of malignancy is strongly penalized.`;
  drawSig(s);
  drawLoss(s, t);
}
function drawSig(s) {
  const { ctx, w, h } = ctxCanvas('sigChart'),
    p = layout(w, h),
    m = mapper(p, -8, 8, 0, 1);
  axes(ctx, p, m, -8, 8, 0, 1, 4, 4);
  curve(ctx, m, sigmoid, -8, 8, '#315cf4');
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = '#90a4bf';
  ctx.beginPath();
  ctx.moveTo(m.x(0), m.y(0));
  ctx.lineTo(m.x(0), m.y(1));
  ctx.moveTo(m.x(-8), m.y(0.5));
  ctx.lineTo(m.x(8), m.y(0.5));
  ctx.stroke();
  ctx.restore();
  point(ctx, m.x(s), m.y(sigmoid(s)), '#e59639', 5);
  textAt(ctx, 'p(class 1)', p.l + 6, 18);
  textAt(ctx, 'logit s', w - 72, h - 5);
}
function drawLoss(s, t) {
  const { ctx, w, h } = ctxCanvas('lossChart'),
    p = layout(w, h),
    m = mapper(p, -8, 8, 0, 8.1);
  axes(ctx, p, m, -8, 8, 0, 8.1, 4, 4);
  curve(ctx, m, (x) => bceLogit(x, t), -8, 8, '#315cf4');
  curve(ctx, m, (x) => qloss(x, t), -8, 8, '#13a38e');
  point(ctx, m.x(s), m.y(bceLogit(s, t)), '#e59639', 5);
  textAt(ctx, 'BCE', p.l + 5, 18, '#315cf4');
  textAt(ctx, 'Squared error', p.l + 60, 18, '#13a38e');
  textAt(ctx, 'logit s', w - 72, h - 5);
}
on('logit', 'input', updateLoss);
on('labelt', 'change', updateLoss);

// Jensen / chord convexity: compare BCE with squared error of sigmoid.
let convexMode = 'bce';
function cFunc(s) {
  return convexMode === 'bce' ? bceLogit(s, 1) : qloss(s, 1);
}
function updateConvex() {
  const a = getSlider('ax'),
    b = getSlider('bx'),
    tau = getSlider('tau'),
    mix = (1 - tau) * a + tau * b,
    curveValue = cFunc(mix),
    chordValue = (1 - tau) * cFunc(a) + tau * cFunc(b),
    ok = curveValue <= chordValue + 1e-10;
  $('axo').textContent = fmt(a, 1);
  $('bxo').textContent = fmt(b, 1);
  $('tauo').textContent = fmt(tau, 2);
  $('cv').textContent = fmt(curveValue, 4);
  $('chord').textContent = fmt(chordValue, 4);
  $('jensen').textContent = ok ? '≤  ✓' : ' >  ✕';
  $('jensen').style.color = ok ? '#13846d' : '#c74654';
  $('convexCaption').textContent =
    convexMode === 'bce'
      ? 'For the class-1 BCE, the blue curve stays at or below the chord for every pair of logits. This is Jensen’s inequality. Select other a, b and λ values to test it.'
      : 'Squared probability error after the sigmoid can violate the chord test. The displayed example is one witness of nonconvexity if f(mixture) > chord; different endpoints can still satisfy the inequality by coincidence.';
  drawConvex(a, b, mix, curveValue, chordValue);
}
function drawConvex(a, b, mix, cv, ch) {
  const { ctx, w, h } = ctxCanvas('convexChart'),
    p = layout(w, h),
    ymax = convexMode === 'bce' ? 8.2 : 1.08,
    m = mapper(p, -8, 8, 0, ymax);
  axes(ctx, p, m, -8, 8, 0, ymax, 4, 4);
  curve(ctx, m, cFunc, -8, 8, '#315cf4', 3);
  ctx.save();
  ctx.strokeStyle = '#e69a42';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 4]);
  ctx.beginPath();
  ctx.moveTo(m.x(a), m.y(cFunc(a)));
  ctx.lineTo(m.x(b), m.y(cFunc(b)));
  ctx.stroke();
  ctx.restore();
  point(ctx, m.x(a), m.y(cFunc(a)), '#e69a42', 5);
  point(ctx, m.x(b), m.y(cFunc(b)), '#e69a42', 5);
  point(ctx, m.x(mix), m.y(cv), '#315cf4', 6);
  point(ctx, m.x(mix), m.y(ch), '#e69a42', 5);
  textAt(ctx, 'Blue: f(s)     Orange: chord', p.l + 7, 17);
  textAt(ctx, 'logit s', w - 72, h - 5);
}
for (const id of ['ax', 'bx', 'tau']) on(id, 'input', updateConvex);
for (const b of document.querySelectorAll('[data-convex]'))
  b.addEventListener('click', () => {
    convexMode = b.dataset.convex;
    document
      .querySelectorAll('[data-convex]')
      .forEach((x) => setSelected(x, x === b));
    if (convexMode === 'mse') {
      $('ax').value = -6;
      $('bx').value = -1;
      $('tau').value = 0.5;
    } else {
      $('ax').value = -4;
      $('bx').value = 3;
      $('tau').value = 0.5;
    }
    updateConvex();
  });

// Actual Hessian local Taylor bowl. The full original logistic loss is not reconstructible without CSV.
function qApprox(d1, d2) {
  const d = [d1, d2, 0],
    hd = H.map((r) => dot(r, d));
  return 0.21216389808618155 + dot(GOPT, d) + 0.5 * dot(d, hd);
}
function gradApprox(d1, d2) {
  const d = [d1, d2, 0];
  return H.map((r, i) => GOPT[i] + dot(r, d));
}
function updateBowl() {
  const d1 = getSlider('delta1'),
    d2 = getSlider('delta2'),
    w = [OPT[0] + d1, OPT[1] + d2, OPT[2]],
    g = gradApprox(d1, d2);
  $('delta1o').textContent = fmt(d1, 2);
  $('delta2o').textContent = fmt(d2, 2);
  $('bowlLoss').textContent = fmt(qApprox(d1, d2), 5);
  $('bowlGrad').textContent = fmt(norm(g), 5);
  $('bowlDelta').textContent = `(${fmt(d1, 1)}, ${fmt(d2, 1)}, 0)`;
  $('bowlNote').textContent =
    `Current nearby coefficients: w ≈ (${fmt(w[0], 3)}, ${fmt(w[1], 3)}, ${fmt(w[2], 3)}). This is a local quadratic Taylor estimate; farther from the optimum the true nonlinear logistic loss need not match it.`;
  drawBowl(d1, d2);
}
function drawBowl(d1, d2) {
  const { ctx, w, h } = ctxCanvas('bowlChart'),
    p = layout(w, h, true),
    m = mapper(p, -5, 5, -4, 4),
    left = p.l,
    top = p.t,
    right = w - p.r,
    bottom = h - p.b;
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, right - left, bottom - top);
  ctx.clip();
  for (let px = left; px < right; px += 5)
    for (let py = top; py < bottom; py += 5) {
      const dx = -5 + ((px - left) / (right - left)) * 10,
        dy = 4 - ((py - top) / (bottom - top)) * 8,
        delta = Math.max(0, qApprox(dx, dy) - 0.21216389808618155);
      const a = Math.min(0.8, delta / 0.38);
      ctx.fillStyle = `rgba(49,92,244,${(0.05 + 0.66 * a).toFixed(3)})`;
      ctx.fillRect(px, py, 5.5, 5.5);
    }
  ctx.restore();
  axes(ctx, p, m, -5, 5, -4, 4, 4, 4);
  // Spectral decomposition of the actual 2x2 upper-left Hessian block.
  const a = H[0][0],
    b = H[0][1],
    d = H[1][1],
    tr = a + d,
    delta = Math.sqrt((a - d) * (a - d) + 4 * b * b),
    lambda1 = (tr + delta) / 2,
    lambda2 = (tr - delta) / 2,
    angle = 0.5 * Math.atan2(2 * b, a - d);
  for (const c of [0.005, 0.015, 0.04, 0.08, 0.14]) {
    ctx.save();
    ctx.strokeStyle = c <= 0.015 ? '#1d5bd0' : '#3c72d0';
    ctx.lineWidth = c <= 0.015 ? 1.8 : 1.2;
    ctx.globalAlpha = 0.86;
    ctx.beginPath();
    for (let k = 0; k <= 180; k++) {
      const t = (2 * Math.PI * k) / 180,
        r1 = Math.sqrt((2 * c) / lambda1),
        r2 = Math.sqrt((2 * c) / lambda2),
        dx =
          Math.cos(angle) * r1 * Math.cos(t) -
          Math.sin(angle) * r2 * Math.sin(t),
        dy =
          Math.sin(angle) * r1 * Math.cos(t) +
          Math.cos(angle) * r2 * Math.sin(t);
      if (k === 0) ctx.moveTo(m.x(dx), m.y(dy));
      else ctx.lineTo(m.x(dx), m.y(dy));
    }
    ctx.stroke();
    ctx.restore();
  }
  point(ctx, m.x(0), m.y(0), '#0a765d', 5);
  const px = m.x(d1),
    py = m.y(d2),
    g = gradApprox(d1, d2),
    gn = Math.hypot(g[0], g[1]);
  point(ctx, px, py, '#ed9a36', 7);
  if (gn > 1e-5) {
    const sc = 32 / gn,
      tx = px - g[0] * sc,
      ty = py + g[1] * sc;
    drawArrow(ctx, px, py, tx, ty, '#d67a24');
  }
  textAt(ctx, 'Optimum  w*', m.x(0) + 8, m.y(0) - 8, '#0a765d');
  textAt(ctx, 'Δw₁', w - 70, h - 4);
  ctx.save();
  ctx.translate(14, 170);
  ctx.rotate(-Math.PI / 2);
  textAt(ctx, 'Δw₂', 0, 0);
  ctx.restore();
}
for (const id of ['delta1', 'delta2']) on(id, 'input', updateBowl);
on('bowlReset', 'click', () => {
  $('delta1').value = 0;
  $('delta2').value = 0;
  updateBowl();
});

// Deterministic optimizer sandbox. Genuine gradient, loss and BFGS updates on the illustrative dataset.
function toyEval(w) {
  let f = 0,
    g = [0, 0, 0];
  for (const o of TOY) {
    const z = [o.x1, o.x2, 1],
      s = dot(w, z),
      p = sigmoid(s);
    f += bceLogit(s, o.t);
    for (let i = 0; i < 3; i++) g[i] += (p - o.t) * z[i];
  }
  return { f: f / TOY.length, g: g.map((v) => v / TOY.length) };
}
const ident = () => [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const matMult = (A, B) =>
  A.map((row) =>
    B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)),
  );
const eyeMinusOuter = (a, b, s) =>
  ident().map((row, i) => row.map((v, j) => v - s * a[i] * b[j]));
let optState;
function resetToy() {
  const e = toyEval([0, 0, 0]);
  optState = {
    w: [0, 0, 0],
    b: ident(),
    hist: [e.f],
    last: 'Start at w = (0,0,0). Every predicted probability is 0.5.',
    steps: 0,
  };
  updateToy();
}
function stepToy(redraw = true) {
  const w = optState.w,
    e = toyEval(w),
    g = e.g;
  let alpha = getSlider('alpha'),
    dir = g.map((x) => -x),
    method = $('method').value;
  if (method === 'bfgs') {
    dir = optState.b.map((row) => -dot(row, g));
    if (dot(dir, g) >= -1e-14) {
      dir = g.map((v) => -v);
      optState.b = ident();
    }
    alpha = 1;
    const dg = dot(dir, g);
    for (let k = 0; k < 35; k++) {
      const tryw = w.map((v, i) => v + alpha * dir[i]);
      if (toyEval(tryw).f <= e.f + 1e-4 * alpha * dg) break;
      alpha *= 0.5;
    }
    if (alpha < 1e-10) {
      optState.last =
        'The illustrative line search could not find a meaningful step.';
      if (redraw) updateToy();
      return;
    }
  }
  const nextw = w.map((v, i) => v + alpha * dir[i]),
    e2 = toyEval(nextw),
    step = nextw.map((v, i) => v - w[i]);
  if (method === 'bfgs') {
    const y = e2.g.map((v, i) => v - g[i]),
      sy = dot(step, y);
    if (sy > 1e-12) {
      const rho = 1 / sy,
        L = eyeMinusOuter(step, y, rho),
        R = eyeMinusOuter(y, step, rho);
      const mid = matMult(matMult(L, optState.b), R);
      optState.b = mid.map((row, i) =>
        row.map((v, j) => v + rho * step[i] * step[j]),
      );
    }
  }
  optState.w = nextw;
  optState.steps++;
  optState.hist.push(e2.f);
  let diff = e2.f - e.f;
  optState.last = `${method === 'gd' ? 'Gradient descent' : 'Illustrative BFGS'} · α used = ${fmt(alpha, 4)} · change in loss = ${diff >= 0 ? '+' : ''}${fmt(diff, 6)}. ${diff > 1e-8 ? 'An overly large step increased loss.' : 'This step reduced (or numerically preserved) the loss.'}`;
  if (redraw) updateToy();
}
function updateToy() {
  const e = toyEval(optState.w);
  $('iterationCount').textContent = optState.steps;
  $('toyLoss').textContent = fmt(e.f, 6);
  $('toyGrad').textContent = fmt(norm(e.g), 5);
  $('toyWeights').textContent =
    '(' + optState.w.map((x) => fmt(x, 2)).join(', ') + ')';
  $('optStatus').textContent = optState.last;
  $('alphao').textContent = fmt(getSlider('alpha'), 2);
  $('alpha').disabled = $('method').value !== 'gd';
  drawToyLoss();
}
function drawToyLoss() {
  const { ctx, w, h } = ctxCanvas('optChart'),
    v = optState.hist,
    p = layout(w, h),
    ymax = v.reduce((max, loss) => Math.max(max, loss), 0.75) * 1.04,
    ymin = 0,
    xmax = Math.max(10, v.length - 1),
    m = mapper(p, 0, xmax, ymin, ymax);
  axes(ctx, p, m, 0, xmax, ymin, ymax, 5, 4);
  ctx.strokeStyle = '#315cf4';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i < v.length; i++) {
    if (i === 0) ctx.moveTo(m.x(i), m.y(v[i]));
    else ctx.lineTo(m.x(i), m.y(v[i]));
  }
  ctx.stroke();
  for (let i = 0; i < v.length; i++) {
    if (v.length <= 18 || i === 0 || i === v.length - 1)
      point(ctx, m.x(i), m.y(v[i]), '#315cf4', 3, false);
  }
  textAt(ctx, 'Toy BCE loss', p.l + 6, 17);
  textAt(ctx, 'iteration', w - 77, h - 4);
}
on('oneStep', 'click', () => stepToy());
on('tenSteps', 'click', () => {
  for (let i = 0; i < 10; i++) stepToy(false);
  updateToy();
});
on('runToEnd', 'click', () => {
  for (let i = 0; i < 60; i++) stepToy(false);
  updateToy();
});
on('resetOpt', 'click', resetToy);
on('method', 'change', resetToy);
on('alpha', 'input', () => {
  $('alphao').textContent = fmt(getSlider('alpha'), 2);
});

const confusionInfo = {
  tn: [
    'True negatives (TN)',
    '167 class-0 observations were predicted as class 0. They are correct non-malignant classifications. TN contributes to accuracy and specificity.',
  ],
  fp: [
    'False positives (FP)',
    '13 actual class-0 observations were predicted as class 1. They are classification errors; FP lowers precision and specificity.',
  ],
  fn: [
    'False negatives (FN)',
    '20 actual class-1 observations were predicted as class 0. They are classification errors; FN lowers recall or sensitivity.',
  ],
  tp: [
    'True positives (TP)',
    '192 actual class-1 observations were predicted as class 1. They are correct malignant classifications. TP contributes to precision, recall and accuracy.',
  ],
};
for (const b of document.querySelectorAll('[data-cell]'))
  b.addEventListener('click', () => {
    const [heading, description] = confusionInfo[b.dataset.cell];
    $('confTitle').textContent = heading;
    $('confInfo').textContent = description;
    document
      .querySelectorAll('[data-cell]')
      .forEach((e) => setSelected(e, e === b, 'active'));
  });
function render() {
  updateDot();
  updateBoundary();
  updateLoss();
  updateConvex();
  updateBowl();
  resetToy();
}

render();
// The sidebar, contents and lab disclosures can resize plots without a window resize.
const redrawCharts = {
  boundaryChart: drawBoundary,
  sigChart: () => drawSig(getSlider('logit')),
  lossChart: () => drawLoss(getSlider('logit'), Number($('labelt').value)),
  convexChart: updateConvex,
  bowlChart: () => drawBowl(getSlider('delta1'), getSlider('delta2')),
  optChart: drawToyLoss,
};
const chartObserver = new ResizeObserver((entries) => {
  for (const { target, contentRect } of entries) {
    if (contentRect.width > 0 && contentRect.height > 0)
      redrawCharts[target.id]();
  }
});
for (const id of Object.keys(redrawCharts)) chartObserver.observe($(id));
