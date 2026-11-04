---
title: "Inside logistic regression"
description: "Follow a straight decision boundary into a convex optimization problem. Explore feature vectors, probabilities, binary cross-entropy, BFGS, and the geometry of the Hessian."
publishedAt: 2026-11-04
author: "Lota Lora Fox"
tags: ["Machine learning", "Optimization", "Reto 4"]
language: "en"
translationKey: "inside-logistic-regression"
---

<link rel="stylesheet" href="/articles/inside-logistic-regression/guide.css">
<script type="module" src="/articles/inside-logistic-regression/guide.js"></script>

Two features and a straight line are enough to build the classifier in my Reto 4 notebook. Finding that line takes us from dot products in feature space to a convex loss in parameter space. This field guide follows that path in 11 sections, pairing the original notebook figures and results with browser-based experiments.

The interactive labs run in your browser with JavaScript and local assets.

## The classification problem

<div class="logistic-guide" id="overview">
<p class="guide-kicker">00 / ORIGINAL NOTEBOOK</p>
<p class="lede">The notebook trains a binary classifier from <strong>radius_mean</strong> and <strong>smoothness_mean</strong> to predict <strong>pronostic</strong>: 1 for malignant, 0 for non-malignant. It optimizes probabilities, then evaluates the resulting linear decision boundary.</p>
 <div class="grid cols3">
  <div class="card metric"><div class="name">Training observations</div><strong>392</strong><div class="meta">180 class 0 · 212 class 1</div></div>
  <div class="card metric"><div class="name">Original → final loss</div><strong>0.6931 → 0.2122</strong><div class="meta">Binary cross-entropy · 20 BFGS iterations</div></div>
  <div class="card metric"><div class="name">Training accuracy</div><strong>91.58%</strong><div class="meta">359 correct · 33 errors</div></div>
 </div>
 <div class="equation">w* = (5.17176466, 1.60446794, 0.56221445)ᵀ</div>
 <div class="flow"><div class="step">raw observations<br><small>392 × 2</small></div><div class="arrow">→</div><div class="step">add bias column<br><small>Z: 392 × 3</small></div><div class="arrow">→</div><div class="step">scores &amp; probabilities</div><div class="arrow">→</div><div class="step">cross-entropy f(w)</div><div class="arrow">→</div><div class="step">minimize over w ∈ ℝ³</div></div>
 <div class="source"><strong>Source: Reto4LuisOtalora.html.</strong> These numerical results and the original figures below come from the Reto 4 notebook. The interactive point-cloud and optimizer experiments later in this guide use a small explicitly labeled <strong>teaching dataset</strong>; the 392 original CSV rows are not embedded in the notebook HTML.</div>
 <div class="grid cols2">
  <figure class="figurebox"><img src="/articles/inside-logistic-regression/training-observations.png" loading="lazy" decoding="async" alt="Original scatter plot of the 392 observations in the notebook"><figcaption>Original notebook: the training observations in feature space.</figcaption></figure>
  <figure class="figurebox"><img src="/articles/inside-logistic-regression/bfgs-training-loss.png" loading="lazy" decoding="async" alt="Original notebook plot of loss decreasing across solver iterations"><figcaption>Original notebook: logged loss from the initial vector through the 20 solver iterations.</figcaption></figure>
 </div>
</div>

## The whole problem is a dot product, repeated 392 times

<div class="logistic-guide" id="vectors">
<p class="guide-kicker">01 / LINEAR ALGEBRA</p>
<p>Each observation begins as a 2D feature vector <span class="mathinline">x = (x₁, x₂)ᵀ</span>. The notebook appends a constant 1, producing a 3D augmented vector <span class="mathinline">z = (x₁, x₂, 1)ᵀ</span>. That extra coordinate lets the model learn an intercept without a separate operation.</p>
 <div class="grid cols2">
  <div class="card"><h3>One observation</h3><div class="formula">zᵢ = [x₁ᵢ, x₂ᵢ, 1]ᵀ       shape (3,)
w  = [w₁,  w₂,  w₃]ᵀ      shape (3,)
sᵢ = wᵀzᵢ = w₁x₁ᵢ + w₂x₂ᵢ + w₃</div><p class="small">The output <strong>sᵢ</strong> is a scalar called a <em>logit</em> or score. Geometrically, w₁ and w₂ define the orientation of a line; w₃ translates it.</p></div>
  <div class="card"><h3>All observations simultaneously</h3><div class="formula">Z ∈ ℝ³⁹²ˣ³     w ∈ ℝ³      s ∈ ℝ³⁹²
Z @ w       → 392 logits
σ(Z @ w)    → 392 probabilities
Z.T @ (y−t) → 3 gradient coordinates</div><p class="small">Each row of Z is one observation. Each column is a model input (two features and a constant).</p></div>
 </div>
 <details class="lab" open>
  <summary class="labhead"><span class="lab-title">Try a matrix multiplication by hand</span><span class="lab-description">Use the sliders to change one augmented row</span></summary>
  <div class="labbody">
  <div class="controls">
   <div class="control"><label for="vx1">x₁ <output id="vx1o">0.70</output></label><input id="vx1" type="range" min="-2" max="2" step="0.05" value="0.7"></div>
   <div class="control"><label for="vx2">x₂ <output id="vx2o">-0.80</output></label><input id="vx2" type="range" min="-2" max="2" step="0.05" value="-0.8"></div>
   <div class="control"><div class="control-label">Bias coordinate <span>1 (fixed)</span></div><div style="font-size:12px;color:#6a7e98;margin-top:10px">A 1 multiplies the intercept w₃.</div></div>
  </div>
  <div class="formula" id="dotstep" aria-live="polite">(5.1718 × 0.70) + (1.6045 × −0.80) + 0.5622 = 2.9000</div>
  <div class="readout"><div class="reading"><div>Logit s</div><strong id="dotS">—</strong></div><div class="reading"><div>Probability σ(s)</div><strong id="dotP">—</strong></div><div class="reading"><div>Prediction ≥ 0.5</div><strong id="dotY">—</strong></div></div>
  <p class="small">This is a synthetic example feature vector evaluated with the <strong>actual optimized weights</strong>. Its computed probability is illustrative, not a record taken from the original dataset.</p>
  </div>
 </details>
 <div class="callout"><strong>Why matrix notation matters:</strong> NumPy can calculate every score with a single <code>Z @ w</code>. More importantly, derivatives become compact: <strong>∇f(w) = Zᵀ(y − t)/m</strong> and <strong>H(w) = ZᵀDZ/m</strong>. Both are built from the same matrix Z.</div>
</div>

## Three coefficients determine one straight line

<div class="logistic-guide" id="boundary">
<p class="guide-kicker">02 / FEATURE SPACE</p>
<p>Logistic regression is called “regression”, but the notebook uses it for binary classification. First compute <span class="mathinline">s = w₁x₁ + w₂x₂ + w₃</span>; then turn it into <span class="mathinline">p = σ(s) = 1/(1+e⁻ˢ)</span>. The class threshold of 0.5 corresponds exactly to <strong>s = 0</strong>.</p>
 <div class="equation">w₁x₁ + w₂x₂ + w₃ = 0 &nbsp; ⟺ &nbsp; x₂ = −(w₁/w₂)x₁ − w₃/w₂</div>
 <details class="lab" open>
  <summary class="labhead"><span class="lab-title">Interactive decision boundary</span><span class="lab-description">Teaching dataset · not the original 392 records</span></summary>
  <div class="labbody">
  <div class="buttonrow"><button type="button" class="btn primary" data-preset="opt" aria-pressed="true">Optimized w*</button><button type="button" class="btn" data-preset="a" aria-pressed="false">Candidate a</button><button type="button" class="btn" data-preset="b" aria-pressed="false">Candidate b</button><button type="button" class="btn" data-preset="c" aria-pressed="false">Candidate c</button><button type="button" class="btn" data-preset="zero" aria-pressed="false">Start at w₀</button></div>
  <canvas role="img" id="boundaryChart" class="chart tall" aria-label="Interactive boundary and illustrative sample of data points"></canvas>
  <div class="legend"><span><i class="dot" style="background:#16856b"></i>Illustrative class 0</span><span><i class="dot" style="background:#c74654"></i>Illustrative class 1</span><span><i class="dot" style="background:#315cf4"></i>Selected example x = (0.7, −0.8)</span></div>
  <div class="controls">
   <div class="control"><label for="w1">w₁ · radius <output id="w1o"></output></label><input id="w1" type="range" min="-8" max="8" step="0.01" value="5.17176466"></div>
   <div class="control"><label for="w2">w₂ · smoothness <output id="w2o"></output></label><input id="w2" type="range" min="-8" max="8" step="0.01" value="1.60446794"></div>
   <div class="control"><label for="w3">w₃ · intercept <output id="w3o"></output></label><input id="w3" type="range" min="-4" max="4" step="0.01" value="0.56221445"></div>
  </div>
  <div class="readout"><div class="reading"><div>Boundary slope</div><strong id="slope">—</strong><small>−w₁/w₂</small></div><div class="reading"><div>Boundary intercept</div><strong id="intercept">—</strong><small>−w₃/w₂</small></div><div class="reading"><div>Example prediction</div><strong id="exampleP">—</strong><small>p(class 1) at blue point</small></div></div>
  <p id="boundaryNote" aria-live="polite" class="small"></p>
  </div>
 </details>
 <div class="callout warning"><strong>Two different spaces, never confuse them:</strong> the <strong>x₁–x₂ chart</strong> shows patients/features and a decision <em>line</em>; the <strong>w₁–w₂–w₃ space</strong> contains all possible models, and each point in that space has a loss. The loss has a convex geometry there—even though the decision boundary in feature space is linear.</div>
</div>

## Why does the notebook minimize cross-entropy?

<div class="logistic-guide" id="loss">
<p class="guide-kicker">03 / PROBABILITY &amp; LOSS</p>
<p>We want high probability on the true class, not just the right side of a threshold. With a Bernoulli model, the likelihood of label <span class="mathinline">t ∈ {0,1}</span> is <span class="mathinline">pᵗ(1−p)¹⁻ᵗ</span>. Minimizing negative log-likelihood gives the <strong>binary cross-entropy (BCE)</strong> used in the notebook.</p>
 <div class="equation">ℓ(p,t) = −t log(p) − (1−t) log(1−p)</div>
 <details class="lab" open>
  <summary class="labhead"><span class="lab-title">One prediction, two loss choices</span><span class="lab-description">Compare BCE vs squared probability error</span></summary>
  <div class="labbody">
  <div class="controls controls-pair"><div class="control"><label for="logit">Model score / logit s <output id="logito">0.00</output></label><input id="logit" type="range" min="-8" max="8" step="0.05" value="0"></div><div class="control"><label for="labelt">Actual label t</label><select id="labelt"><option value="1">1 · malignant</option><option value="0">0 · non-malignant</option></select></div></div>
  <div class="twochart"><div><canvas role="img" class="chart" id="sigChart" aria-label="Sigmoid probability function"></canvas><p class="small center">Sigmoid: turns a logit into a probability</p></div><div><canvas role="img" class="chart" id="lossChart" aria-label="BCE and squared error curves as functions of score"></canvas><p class="small center">Loss as a function of the <em>logit s</em></p></div></div>
  <div class="readout"><div class="reading"><div>Predicted p(class 1)</div><strong id="prob">—</strong></div><div class="reading"><div>BCE contribution</div><strong id="bceloss">—</strong><small>optimized by the notebook</small></div><div class="reading"><div>Squared error</div><strong id="mseloss">—</strong><small>comparison only</small></div></div>
  <div class="scorebox" id="lossexplain" aria-live="polite"></div>
  </div>
 </details>
 <div class="grid cols2">
  <div class="card"><h3>BCE has the right probabilistic interpretation</h3><p>Its average is the negative log-likelihood of the training labels, so minimizing BCE is <strong>maximum likelihood estimation</strong> for Bernoulli observations. It heavily penalizes confident wrong predictions and rewards calibrated probabilities.</p></div>
  <div class="card"><h3>Why not optimize accuracy directly?</h3><p>Accuracy jumps only when a prediction crosses 0.5. As a function of w, it is a discontinuous, piecewise-constant objective with no useful ordinary gradient. BCE is smooth, differentiable and convex in w for this linear-logit model.</p></div>
 </div>
 <div class="formula"># Original stable implementation
s = Z @ w
loss = np.mean(np.logaddexp(0.0, s) - t * s)</div>
 <p><strong>Why <code>np.logaddexp</code>?</strong> It computes <span class="mathinline">log(1+eˢ)</span> stably even for very large positive s. Algebraically, <span class="mathinline">ℓ(s,t) = log(1+eˢ) − ts</span> is exactly the same BCE, expressed in logits. A direct <code>np.log(1+np.exp(s))</code> may overflow. The notebook stabilizes its loss; for very extreme logits the standalone sigmoid could also be implemented more robustly with <code>scipy.special.expit</code>.</p>
</div>

## Why is the loss a convex curve, and why is that powerful?

<div class="logistic-guide" id="convexity">
<p class="guide-kicker">04 / CONVEX ANALYSIS</p>
<p>A convex function lies <strong>at or below</strong> the straight chord connecting any two points on its graph. For a twice differentiable one-variable function, a nonnegative second derivative everywhere is enough to prove convexity. Logistic cross-entropy satisfies that condition as a function of the logit.</p>
 <div class="equation">ℓ″(s,t) = σ(s)(1 − σ(s)) ≥ 0</div>
 <details class="lab" open>
  <summary class="labhead"><span class="lab-title">Move the chord: visualize Jensen's inequality</span><span class="lab-description">Experiment with BCE and an alternative</span></summary>
  <div class="labbody">
  <div class="controls"><div class="control"><label for="ax">Endpoint a <output id="axo"></output></label><input id="ax" type="range" min="-8" max="7" step="0.1" value="-4"></div><div class="control"><label for="bx">Endpoint b <output id="bxo"></output></label><input id="bx" type="range" min="-7" max="8" step="0.1" value="3"></div><div class="control"><label for="tau">Mixture λ <output id="tauo"></output></label><input id="tau" type="range" min="0.05" max="0.95" step="0.05" value="0.5"></div></div>
  <div class="buttonrow"><button type="button" class="btn primary" data-convex="bce" aria-pressed="true">Cross-entropy (convex)</button><button type="button" class="btn" data-convex="mse" aria-pressed="false">Squared error after sigmoid (not globally convex)</button></div>
  <canvas role="img" id="convexChart" class="chart tall" aria-label="Convexity plot with moving chord and chosen point"></canvas>
  <div class="readout"><div class="reading"><div>Curve value f(mixture)</div><strong id="cv">—</strong></div><div class="reading"><div>Chord value</div><strong id="chord">—</strong></div><div class="reading"><div>Jensen inequality</div><strong id="jensen">—</strong><small>Convex if f(mix) ≤ chord for all pairs</small></div></div>
  <p class="small" id="convexCaption" aria-live="polite"></p>
  </div>
 </details>
 <div class="grid cols2"><div class="card"><h3>From a convex curve to a convex surface</h3><p>Every logit <span class="mathinline">sᵢ = zᵢᵀw</span> is <em>affine</em> in w. A convex loss composed with an affine function remains convex. An average of convex functions remains convex. Therefore, <strong>f(w)</strong> is convex throughout ℝ³.</p></div><div class="card"><h3>Why the sigmoid isn't the convex object</h3><p>The sigmoid is S-shaped: it changes curvature. Its graph is <strong>not globally convex</strong>. What is convex is <em>cross-entropy applied to the linear score</em> as a function of the parameters. Squared error applied to sigmoid probabilities generally loses this guarantee.</p></div></div>
 <div class="callout"><strong>Global-minimum guarantee:</strong> For a differentiable convex f, any stationary point (<span class="mathinline">∇f(w) = 0</span>) is a global minimizer. With the notebook's full-rank design matrix and finite weights, the logistic Hessian is positive definite, making the objective strictly convex and its finite minimizer unique. Convexity does not mean BFGS magically reaches the solution in one step, or that the training loss becomes zero.</div>
</div>

## What exactly happens inside `minimize`?

<div class="logistic-guide" id="minimize">
<p class="guide-kicker">05 / THE OPTIMIZER</p>
<p>The notebook calls <code>minimize(perdida, w0, args=(Z, t), callback=guardar_perdida)</code>. Because there are no bounds, constraints, Jacobian or method specified, SciPy chooses <strong>BFGS</strong> by default for this unconstrained problem, numerically approximates derivatives and iteratively improves w.</p>
 <div class="grid cols2">
  <div class="card"><h3>Gradient descent: useful baseline</h3><div class="formula">wₖ₊₁ = wₖ − α ∇f(wₖ)</div><p>It follows the local steepest-descent direction. The step-size α affects stability: too small is slow; too large can overshoot.</p></div>
  <div class="card"><h3>BFGS: the notebook's method</h3><div class="formula">pₖ ≈ −Bₖ ∇f(wₖ)
wₖ₊₁ = wₖ + αₖ pₖ</div><p>Bₖ is a changing approximation of the <em>inverse Hessian</em>. BFGS adapts to curvature and uses a line search. It does <strong>not</strong> require you to supply the true Hessian.</p></div>
 </div>
 <div class="flow"><div class="step">Start<br>w₀ = (0,0,0)</div><div class="arrow">→</div><div class="step">Evaluate<br>f(wₖ)</div><div class="arrow">→</div><div class="step">Estimate<br>∇f(wₖ)</div><div class="arrow">→</div><div class="step">Find direction<br>and line-search step</div><div class="arrow">→</div><div class="step">Update w,<br>check stop</div></div>
 <details class="lab" open>
  <summary class="labhead"><span class="lab-title">Optimizer sandbox: run the iterations yourself</span><span class="lab-description">Toy logistic dataset · true computed losses, not historical notebook steps</span></summary>
  <div class="labbody">
   <div class="controls"><div class="control"><label for="method">Teaching optimizer</label><select id="method"><option value="gd">Gradient descent</option><option value="bfgs">Illustrative BFGS</option></select></div><div class="control"><label for="alpha">GD learning rate α <output id="alphao">0.60</output></label><input id="alpha" type="range" min="0.05" max="4" step="0.05" value="0.6"></div><div class="control"><div class="control-label">Iterations so far</div><div style="font-size:22px;font-weight:850;color:#214acc;padding-top:6px" id="iterationCount">0</div></div></div>
   <div class="buttonrow"><button type="button" class="btn primary" id="oneStep">One step</button><button type="button" class="btn" id="tenSteps">Ten steps</button><button type="button" class="btn" id="runToEnd">Run 60 steps</button><button type="button" class="btn" id="resetOpt">Reset to zero</button></div>
   <canvas role="img" id="optChart" class="chart" aria-label="Actual toy logistic optimization loss by iteration"></canvas>
   <div class="readout"><div class="reading"><div>Current toy loss</div><strong id="toyLoss">—</strong></div><div class="reading"><div>Gradient magnitude</div><strong id="toyGrad">—</strong></div><div class="reading"><div>Current w</div><strong id="toyWeights" style="font-size:13px">—</strong></div></div>
   <div class="scorebox small" id="optStatus" aria-live="polite"></div>
   <p class="small"><strong>Important:</strong> This executes a minimal gradient-descent or inverse-Hessian BFGS <em>demonstration in JavaScript</em> on deterministic toy observations. SciPy's production BFGS has a more sophisticated line search, stopping conditions and derivative approximations. The notebook's actual run is still the separate 20-iteration plot above.</p>
  </div>
 </details>
 <div class="grid cols2"><div class="card"><h3>What is saved by the callback?</h3><p>The notebook initializes <code>historial_f = [perdida(w0,Z,t)]</code> manually and appends a loss each time the callback receives an updated vector. <code>callback</code> is for observation/recording; it does <strong>not</strong> change the mathematical objective.</p></div><div class="card"><h3>Why did it stop?</h3><p>Its output reports <code>success=True</code>, 20 iterations, <span class="mathinline">f(w*) = 0.212163898</span>, and <span class="mathinline">‖∇f(w*)‖ ≈ 4.16×10⁻⁶</span>. A small gradient indicates little first-order improvement remains; combined with convexity, this supports a global minimizer.</p></div></div>
</div>

## The gradient is a direction; the Hessian is a curvature map

<div class="logistic-guide" id="hessian">
<p class="guide-kicker">06 / DIFFERENTIAL GEOMETRY</p>
<p>The notebook derives the gradient and Hessian analytically for <span class="mathinline">f(w)</span>. The gradient is a 3-vector indicating how sensitive the loss is to each coefficient. The Hessian is a symmetric 3×3 matrix describing how the gradient changes as we move in parameter space.</p>
 <div class="formula">y = σ(Zw)                 shape: (392,)
∇f(w) = Zᵀ(y − t)/392     shape: (3,)
D = diag(yᵢ(1−yᵢ))       shape: (392, 392)
H(w) = Zᵀ D Z / 392      shape: (3, 3)</div>
 <div class="callout"><strong>Proof that Hessian is positive semidefinite:</strong> for any v ∈ ℝ³,<div class="equation">vᵀH(w)v = (1/392) Σᵢ yᵢ(1−yᵢ)(zᵢᵀv)² ≥ 0.</div>Every term is nonnegative. At finite w, all yᵢ(1−yᵢ) are strictly positive mathematically, and because the notebook reports <span class="mathinline">rank(Z) = 3</span>, this expression is positive for every v ≠ 0. That is the deeper reason for strict convexity here—not merely that three eigenvalues happened to be positive at the final point.</div>
 <details class="lab" open>
  <summary class="labhead"><span class="lab-title">Walk around the convex bowl</span><span class="lab-description">Second-order Taylor approximation at the <em>actual</em> notebook optimum</span></summary>
  <div class="labbody">
  <p class="small">Fix w₃ at its optimized value. Move w₁ and w₂ near w*. Using the <strong>actual Hessian matrix</strong>, the local loss is approximated by <span class="mathinline">f(w*+δ) ≈ f(w*) + ∇f(w*)ᵀδ + ½δᵀH*δ</span>. The colors and ellipses are <strong>not exact global loss contours</strong> because the original 392 CSV rows are absent from this HTML.</p>
  <canvas role="img" id="bowlChart" class="chart tall" aria-label="Local quadratic bowl contour around actual optimum"></canvas>
  <div class="controls controls-pair"><div class="control"><label for="delta1">Δw₁ from optimum <output id="delta1o">2.00</output></label><input id="delta1" type="range" min="-5" max="5" step="0.1" value="2"></div><div class="control"><label for="delta2">Δw₂ from optimum <output id="delta2o">1.00</output></label><input id="delta2" type="range" min="-4" max="4" step="0.1" value="1"></div></div>
  <div class="readout"><div class="reading"><div>Approx. local f(w)</div><strong id="bowlLoss">—</strong></div><div class="reading"><div>Approx. gradient norm</div><strong id="bowlGrad">—</strong></div><div class="reading"><div>Δw = (Δw₁,Δw₂,0)</div><strong id="bowlDelta">—</strong></div></div>
  <div class="buttonrow"><button type="button" class="btn" id="bowlReset">Return to optimum</button></div>
  <p class="small" id="bowlNote" aria-live="polite"></p>
  </div>
 </details>
 <div class="grid cols2"><div class="card"><h3>Real Hessian at w*</h3><div class="formula">[ 0.012118  −0.015377  −0.012501 ]
[−0.015377   0.059502   0.009306 ]
[−0.012501   0.009306   0.065703 ]</div><p class="small">Off-diagonal terms describe interaction between parameters; symmetry follows from continuous mixed partial derivatives.</p></div><div class="card"><h3>Actual Hessian eigenvalues</h3><div class="formula">λ₁ = 0.00603294
λ₂ = 0.05323680
λ₃ = 0.07805335</div><p class="small">All positive → <strong>positive definite at w*</strong>. Eigenvectors identify principal directions; eigenvalues measure curvature along them. A small eigenvalue means a relatively flat direction.</p></div></div>
 <p>Remember: <span class="mathinline">∇f(w*) ≈ (−1.06×10⁻⁶, 3.52×10⁻⁶, 1.97×10⁻⁶)</span> is small but not exactly zero because this is numerical optimization. The Hessian is <strong>not</strong> expected to be zero at the minimum; a positive Hessian is the signature of an upward-curving valley.</p>
</div>

## Why loss and classification metrics answer different questions

<div class="logistic-guide" id="evaluation">
<p class="guide-kicker">07 / EVALUATION</p>
<p>Loss evaluates <strong>the quality of predicted probabilities</strong>. A confusion matrix evaluates <strong>hard decisions after thresholding at 0.5</strong>. The notebook reports both on the same training observations, so these are training results—not evidence of generalization to unseen patients.</p>
 <details class="lab" open>
  <summary class="labhead"><span class="lab-title">Explore the original confusion matrix</span><span class="lab-description">Click any cell to inspect its meaning</span></summary>
  <div class="labbody">
  <div class="split"><div>
   <div class="confusion"><div></div><div class="axistag">Predicted 0</div><div class="axistag">Predicted 1</div><div class="axistag">Real 0</div><button type="button" class="cellbutton" data-cell="tn" aria-pressed="false"><strong>167</strong><span>True negative</span></button><button type="button" class="cellbutton err" data-cell="fp" aria-pressed="false"><strong>13</strong><span>False positive</span></button><div class="axistag">Real 1</div><button type="button" class="cellbutton err" data-cell="fn" aria-pressed="false"><strong>20</strong><span>False negative</span></button><button type="button" class="cellbutton" data-cell="tp" aria-pressed="false"><strong>192</strong><span>True positive</span></button></div>
  </div><div class="card" style="background:#f8fbff"><h3 id="confTitle">Choose a cell</h3><p id="confInfo" aria-live="polite" class="small">The diagonal contains correct classifications; the off-diagonal cells contain errors.</p><div class="minitable"><div class="rowpair"><span>Accuracy</span><strong>91.58%</strong></div><div class="rowpair"><span>Precision (class 1)</span><strong>93.66%</strong></div><div class="rowpair"><span>Recall / sensitivity</span><strong>90.57%</strong></div><div class="rowpair"><span>Specificity</span><strong>92.78%</strong></div><div class="rowpair"><span>F1 score</span><strong>92.09%</strong></div></div></div></div>
  <div class="formula">Accuracy  = (TP+TN)/m       = (192+167)/392 ≈ 91.58%
Precision = TP/(TP+FP)      = 192/205       ≈ 93.66%
Recall    = TP/(TP+FN)      = 192/212       ≈ 90.57%</div>
  </div>
 </details>
 <div class="grid cols2"><div class="card"><h3>What the notebook truly demonstrates</h3><p>BFGS finds a lower <strong>training</strong> BCE than the prior candidates. The optimized model makes 359 correct hard predictions on the 392 training rows, at the notebook's fixed threshold.</p></div><div class="card"><h3>What you would test next</h3><p>Use held-out test data or cross-validation; examine ROC-AUC, precision–recall trade-offs and calibration, and choose the decision threshold based on the cost of each error. None of those tests were carried out in the Reto 4 notebook.</p></div></div>
</div>

## Which candidate wins, and by what definition?

<div class="logistic-guide" id="compare">
<p class="guide-kicker">08 / THE FOUR MODELS</p>
<p>The notebook compares three fixed candidates from Reto 3 with the BFGS solution from Reto 4. They are evaluated on <em>the same</em> Z and t, so their losses are directly comparable.</p>
 <details class="lab" open>
  <summary class="labhead"><span class="lab-title">Original notebook values</span><span class="lab-description">Smaller cross-entropy and gradient norm are preferable here</span></summary>
  <div class="labbody">
  <div class="barrow"><strong>Optimized</strong><div class="bartrack"><div class="barfill best" style="width:32.47%"></div></div><span>0.212164</span></div>
  <div class="barrow"><strong>a</strong><div class="bartrack"><div class="barfill" style="width:33.93%"></div></div><span>0.221731</span></div>
  <div class="barrow"><strong>c</strong><div class="bartrack"><div class="barfill" style="width:60.14%"></div></div><span>0.393056</span></div>
  <div class="barrow"><strong>b</strong><div class="bartrack"><div class="barfill" style="width:100%"></div></div><span>0.653523</span></div>
  <div class="table-scroll" role="region" aria-label="Candidate comparison" tabindex="0"><table class="minitable"><thead><tr><th>Candidate</th><th>Weights (w₁,w₂,w₃)</th><th>‖∇f(w)‖</th><th>Smallest λ(H)</th></tr></thead><tbody><tr><td>Optimized</td><td>(5.1718, 1.6045, 0.5622)</td><td>0.000004</td><td>0.006033</td></tr><tr><td>a</td><td>(4.0364, 1.3192, 0.0603)</td><td>0.027494</td><td>0.011861</td></tr><tr><td>c</td><td>(1.0000, 0.5020, 0.0603)</td><td>0.159099</td><td>0.134484</td></tr><tr><td>b</td><td>(1.3450, 3.5970, 0.5880)</td><td>0.245193</td><td>0.014797</td></tr></tbody></table></div>
  <p class="small">The optimized loss is about <strong>4.31% lower</strong> than candidate a. Every reported Hessian in this comparison is positive definite at the evaluated point. This does not imply all four have equal fit or gradients.</p>
  </div>
 </details>
 <figure class="figurebox"><img src="/articles/inside-logistic-regression/candidate-boundaries.png" loading="lazy" decoding="async" alt="Original notebook graph comparing candidate boundaries with optimized boundary"><figcaption>Original notebook: dashed a/b/c decision boundaries versus the optimized boundary, over the real scatter plot.</figcaption></figure>
</div>

## Can you reason through the whole chain?

<div class="logistic-guide" id="mastery">
<p class="guide-kicker">09 / CONCEPT CHECKS</p>
<p class="lede">Try to answer each question before expanding it. Each answer is tied to a specific idea used by the notebook.</p>
 <details class="qa"><summary>Why does Z have 3 columns if there are only 2 features?</summary><div class="ans">The third column consists of ones. It multiplies the intercept w₃, making every logit a dot product between two 3-vectors: [x₁,x₂,1] and [w₁,w₂,w₃].</div></details>
 <details class="qa"><summary>If a point is classified correctly, does its loss have to be small?</summary><div class="ans">Not necessarily. A correct class-1 probability of 0.51 has BCE ≈ 0.673, while a confident correct prediction of 0.99 has BCE ≈ 0.010. Both count as correct under accuracy, but BCE distinguishes them.</div></details>
 <details class="qa"><summary>The sigmoid curve has an S shape. How can logistic regression be convex?</summary><div class="ans">The sigmoid itself is not globally convex. The objective is BCE of an affine logit: softplus(zᵀw) − t(zᵀw). Its Hessian ZᵀDZ/m is positive semidefinite for every finite parameter vector.</div></details>
 <details class="qa"><summary>Why does a positive definite Hessian at the solution matter?</summary><div class="ans">It indicates upward curvature in every local parameter direction. Together with the globally convex structure and a very small gradient, it supports a unique global minimizer for the full-rank model. Positive definiteness at just one arbitrary point alone does not prove global convexity for an unrelated function.</div></details>
 <details class="qa"><summary>Does SciPy's BFGS use the hessiana(w,Z,t) function in this notebook?</summary><div class="ans">No. The notebook passes only perdida, w0, args and a callback. BFGS estimates gradients numerically here and builds its own inverse-Hessian approximation. The analytical Hessian is computed later for evaluation.</div></details>
 <details class="qa"><summary>Can 91.58% training accuracy be interpreted as clinical accuracy on future patients?</summary><div class="ans">No. This percentage is computed on the same 392 observations used for training. Independent validation or test data and appropriate clinical evaluation are needed before interpreting performance on unseen patients.</div></details>
</div>

## The notebook, line by line in mathematical terms

<div class="logistic-guide" id="reference">
<p class="guide-kicker">10 / CODE MAP</p>
<div class="card"><h3>Core functions, matching the notebook implementation</h3><pre class="code"><code><span class="kw">def</span> <span class="fn">sigmoide</span>(s):
    <span class="kw">return</span> 1 / (1 + np.exp(-s))
<span class="kw">def</span> <span class="fn">perdida</span>(w, Z, t):
    s = Z @ np.asarray(w, dtype=float)
    <span class="kw">return</span> np.mean(np.logaddexp(0.0, s) - t * s)
<span class="kw">def</span> <span class="fn">gradiente</span>(w, Z, t):
    y = sigmoide(Z @ w)
    <span class="kw">return</span> Z.T @ (y - t) / len(t)
<span class="kw">def</span> <span class="fn">hessiana</span>(w, Z, t):
    y = sigmoide(Z @ w)
    pesos = y * (1 - y)
    <span class="kw">return</span> (Z.T * pesos) @ Z / len(t)
w0 = np.zeros(3)
historial_f = [perdida(w0, Z, t)]
<span class="kw">def</span> <span class="fn">guardar_perdida</span>(w):
    historial_f.append(perdida(w, Z, t))
resultado = minimize(perdida, w0, args=(Z, t),
                     callback=guardar_perdida)
w_opt = resultado.x</code></pre></div>
 <div class="grid cols2" style="margin-top:16px"><div class="card"><h3>What each object means</h3><p><code>resultado.x</code> is the parameter vector; <code>resultado.fun</code> is the objective value at that vector; <code>resultado.nit</code> counts optimizer iterations; <code>resultado.success</code> is its success flag. The callback records iterates, but function evaluations can be more numerous than iterations.</p></div><div class="card"><h3>Optional clarity improvement</h3><pre class="code"><code>resultado = minimize(
    perdida, w0,
    args=(Z, t),
    method="BFGS",
    jac=gradiente,
    callback=guardar_perdida
)</code></pre><p class="small">This is an <strong>additional suggestion</strong>, not the original code. Passing <code>jac=gradiente</code> provides the analytical gradient, avoiding BFGS's need to estimate it by finite differences. It can change numerical details of the run.</p></div></div>
 <div class="callout" style="margin-top:17px"><strong>Final mental model:</strong> rows of Z are observations → Z @ w forms linear scores → sigmoid gives probabilities → BCE measures mismatch → BFGS searches in parameter space → gradient indicates where to move → Hessian shows the bowl’s curvature → convexity makes a stationary point globally optimal → the resulting w defines a straight classification boundary in feature space.</div>
</div>

*Source: Reto 4 (Reto4LuisOtalora.html). The training figures and results come from the notebook. The interactive labs identify their teaching data and local quadratic approximation. The clinical labels are part of an educational dataset.*
