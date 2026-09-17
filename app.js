'use strict';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const TAU = Math.PI * 2;

function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

class RNG {
  constructor(seed) {
    const seedFn = hashString(String(seed));
    this.state = seedFn();
    this._gauss = null;
  }
  next() {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min, max) { return min + (max - min) * this.next(); }
  int(min, max) { return Math.floor(this.range(min, max + 1)); }
  gaussian() {
    if (this._gauss !== null) {
      const g = this._gauss;
      this._gauss = null;
      return g;
    }
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u));
    const a = TAU * v;
    this._gauss = mag * Math.sin(a);
    return mag * Math.cos(a);
  }
}

class NeuralNetwork {
  constructor(genome) {
    this.layers = genome.layers.slice();
    this.weights = genome.weights.map(layer => layer.slice());
    this.biases = genome.biases.map(layer => layer.slice());
    this.activations = [];
  }

  static createRandom(rng, layers = [10, 12, 8, 4]) {
    const weights = [];
    const biases = [];
    for (let l = 0; l < layers.length - 1; l++) {
      const inN = layers[l], outN = layers[l + 1];
      const scale = Math.sqrt(2 / Math.max(1, inN));
      const w = new Array(inN * outN);
      for (let i = 0; i < w.length; i++) w[i] = rng.gaussian() * scale;
      const b = new Array(outN);
      for (let i = 0; i < outN; i++) b[i] = rng.gaussian() * 0.15;
      weights.push(w);
      biases.push(b);
    }
    return { layers, weights, biases };
  }

  forward(input) {
    let current = input.slice();
    this.activations = [current.slice()];
    for (let l = 0; l < this.weights.length; l++) {
      const inN = this.layers[l];
      const outN = this.layers[l + 1];
      const out = new Array(outN).fill(0);
      for (let j = 0; j < outN; j++) {
        let sum = this.biases[l][j];
        const offset = j * inN;
        for (let i = 0; i < inN; i++) sum += current[i] * this.weights[l][offset + i];
        out[j] = l === this.weights.length - 1
          ? 1 / (1 + Math.exp(-sum))
          : Math.tanh(sum);
      }
      current = out;
      this.activations.push(out.slice());
    }
    return current;
  }
}

function randomGenome(rng) {
  const brain = NeuralNetwork.createRandom(rng);
  return {
    layers: brain.layers,
    weights: brain.weights,
    biases: brain.biases,
    speed: rng.range(1.0, 2.35),
    vision: rng.range(75, 155),
    efficiency: rng.range(0.88, 1.12),
    hue: rng.int(120, 205)
  };
}

function mutateGenome(parent, rng, rate, strength) {
  const child = {
    layers: parent.layers.slice(),
    weights: parent.weights.map(layer => layer.slice()),
    biases: parent.biases.map(layer => layer.slice()),
    speed: parent.speed,
    vision: parent.vision,
    efficiency: parent.efficiency,
    hue: parent.hue
  };
  child.weights.forEach(layer => {
    for (let i = 0; i < layer.length; i++) {
      if (rng.next() < rate) layer[i] += rng.gaussian() * strength;
    }
  });
  child.biases.forEach(layer => {
    for (let i = 0; i < layer.length; i++) {
      if (rng.next() < rate) layer[i] += rng.gaussian() * strength;
    }
  });
  if (rng.next() < rate) child.speed = clamp(child.speed + rng.gaussian() * strength * 0.5, 0.65, 3.4);
  if (rng.next() < rate) child.vision = clamp(child.vision + rng.gaussian() * strength * 35, 45, 240);
  if (rng.next() < rate) child.efficiency = clamp(child.efficiency + rng.gaussian() * strength * 0.08, 0.72, 1.35);
  if (rng.next() < rate * 0.6) child.hue = (child.hue + rng.gaussian() * 14 + 360) % 360;
  return child;
}

function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

class Organism {
  constructor(sim, options = {}) {
    this.id = sim.nextLifeId++;
    this.x = options.x ?? sim.rng.range(12, sim.width - 12);
    this.y = options.y ?? sim.rng.range(12, sim.height - 12);
    this.dir = options.dir ?? sim.rng.range(-Math.PI, Math.PI);
    this.generation = options.generation ?? 0;
    this.parentId = options.parentId ?? null;
    this.genome = options.genome ?? randomGenome(sim.rng);
    this.brain = new NeuralNetwork(this.genome);
    this.energy = options.energy ?? sim.rng.range(85, 110);
    this.age = 0;
    this.children = 0;
    this.foodEaten = 0;
    this.lastAction = 'spawn';
    this.lastOutputs = [0, 0, 0, 0];
    this.lastInputs = new Array(10).fill(0);
    this.reproductionCooldown = 0;
    this.alive = true;
  }

  nearest(items, vision, skipSelf = false) {
    let best = null;
    let bestD2 = vision * vision;
    for (const item of items) {
      if (skipSelf && item === this) continue;
      const dx = item.x - this.x;
      const dy = item.y - this.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = item;
      }
    }
    return best ? { item: best, distance: Math.sqrt(bestD2) } : null;
  }

  sense(sim) {
    const vision = this.genome.vision;
    const food = this.nearest(sim.food, vision);
    const life = this.nearest(sim.organisms, vision, true);

    let foodPresence = 0, foodProximity = 0, foodSin = 0, foodCos = 0;
    if (food) {
      foodPresence = 1;
      foodProximity = 1 - food.distance / vision;
      const angle = wrapAngle(Math.atan2(food.item.y - this.y, food.item.x - this.x) - this.dir);
      foodSin = Math.sin(angle);
      foodCos = Math.cos(angle);
    }

    let lifeProximity = 0, lifeSin = 0, lifeCos = 0;
    if (life) {
      lifeProximity = 1 - life.distance / vision;
      const angle = wrapAngle(Math.atan2(life.item.y - this.y, life.item.x - this.x) - this.dir);
      lifeSin = Math.sin(angle);
      lifeCos = Math.cos(angle);
    }

    const energyNorm = clamp(this.energy / 200, 0, 1);
    const ageNorm = clamp(this.age / 5000, 0, 1);
    const noise = sim.rng.range(-1, 1);
    return [foodPresence, foodProximity, foodSin, foodCos, lifeProximity, lifeSin, lifeCos, energyNorm, ageNorm, noise];
  }

  update(sim) {
    this.age++;
    if (this.reproductionCooldown > 0) this.reproductionCooldown--;

    this.lastInputs = this.sense(sim);
    this.lastOutputs = this.brain.forward(this.lastInputs);
    let actionIndex = 0;
    for (let i = 1; i < this.lastOutputs.length; i++) {
      if (this.lastOutputs[i] > this.lastOutputs[actionIndex]) actionIndex = i;
    }

    const efficiency = this.genome.efficiency;
    this.energy -= 0.025 * efficiency;

    if (actionIndex === 0) {
      this.lastAction = 'move';
      const speed = this.genome.speed * (0.6 + this.lastOutputs[0] * 0.7);
      this.x += Math.cos(this.dir) * speed;
      this.y += Math.sin(this.dir) * speed;
      this.energy -= 0.055 * efficiency * speed;
    } else if (actionIndex === 1) {
      this.lastAction = 'turn-left';
      this.dir -= 0.07 + this.lastOutputs[1] * 0.11;
      this.energy -= 0.026 * efficiency;
    } else if (actionIndex === 2) {
      this.lastAction = 'turn-right';
      this.dir += 0.07 + this.lastOutputs[2] * 0.11;
      this.energy -= 0.026 * efficiency;
    } else {
      this.lastAction = 'eat';
      this.energy -= 0.018 * efficiency;
      this.tryEat(sim);
    }

    if (this.x < 0) this.x += sim.width;
    if (this.x >= sim.width) this.x -= sim.width;
    if (this.y < 0) this.y += sim.height;
    if (this.y >= sim.height) this.y -= sim.height;
    this.dir = wrapAngle(this.dir);

    if (this.energy > sim.settings.reproductionThreshold && this.age > 220 && this.reproductionCooldown <= 0) {
      sim.reproduce(this);
    }
    if (this.energy <= 0 || this.age > 10000) this.alive = false;
  }

  tryEat(sim) {
    let bestIndex = -1;
    let bestD2 = 14 * 14;
    for (let i = 0; i < sim.food.length; i++) {
      const f = sim.food[i];
      const dx = f.x - this.x, dy = f.y - this.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        bestIndex = i;
      }
    }
    if (bestIndex >= 0) {
      sim.food.splice(bestIndex, 1);
      this.foodEaten++;
      sim.stats.foodConsumed++;
      this.energy = Math.min(230, this.energy + sim.settings.foodEnergy);
    }
  }
}

class Simulation {
  constructor(width, height, settings, onEvent) {
    this.width = width;
    this.height = height;
    this.onEvent = onEvent;
    this.reset(settings);
  }

  reset(settings) {
    this.settings = { ...settings };
    this.rng = new RNG(settings.seed);
    this.nextLifeId = 1;
    this.nextFoodId = 1;
    this.tick = 0;
    this.organisms = [];
    this.food = [];
    this.stats = { births: 0, deaths: 0, foodConsumed: 0, maxGeneration: 0, avgAge: 0, avgEnergy: 0, history: [] };
    for (let i = 0; i < settings.initialPopulation; i++) this.organisms.push(new Organism(this));
    for (let i = 0; i < settings.initialFood; i++) this.spawnFood();
    this.pushHistory();
    this.emit(`実験開始: ${settings.initialPopulation}個体 / Seed ${settings.seed}`, 'milestone');
  }

  emit(message, type = 'normal') {
    if (this.onEvent) this.onEvent({ tick: this.tick, message, type });
  }

  spawnFood() {
    if (this.food.length >= this.settings.maxFood) return;
    this.food.push({ id: this.nextFoodId++, x: this.rng.range(6, this.width - 6), y: this.rng.range(6, this.height - 6), size: this.rng.range(2.2, 4.3) });
  }

  reproduce(parent) {
    if (this.organisms.length >= 1200) return;
    parent.energy -= 58;
    parent.children++;
    parent.reproductionCooldown = 180;
    const genome = mutateGenome(parent.genome, this.rng, this.settings.mutationRate, this.settings.mutationStrength);
    const child = new Organism(this, {
      x: parent.x + this.rng.range(-12, 12),
      y: parent.y + this.rng.range(-12, 12),
      dir: parent.dir + this.rng.range(-0.5, 0.5),
      generation: parent.generation + 1,
      parentId: parent.id,
      genome,
      energy: 64
    });
    if (child.x < 0) child.x += this.width;
    if (child.x >= this.width) child.x -= this.width;
    if (child.y < 0) child.y += this.height;
    if (child.y >= this.height) child.y -= this.height;
    this.organisms.push(child);
    this.stats.births++;
  }

  step() {
    this.tick++;
    if (this.rng.next() < this.settings.foodSpawn) this.spawnFood();
    if (this.food.length < this.settings.initialFood * 0.35 && this.rng.next() < 0.35) this.spawnFood();

    const before = this.organisms.length;
    const birthsBefore = this.stats.births;
    const current = this.organisms.slice();
    for (const organism of current) if (organism.alive) organism.update(this);
    this.organisms = this.organisms.filter(o => o.alive);
    const birthsThisStep = this.stats.births - birthsBefore;
    const died = before + birthsThisStep - this.organisms.length;
    if (died > 0) this.stats.deaths += died;

    let ageSum = 0, energySum = 0, maxGen = 0;
    for (const o of this.organisms) {
      ageSum += o.age;
      energySum += o.energy;
      if (o.generation > maxGen) maxGen = o.generation;
    }
    this.stats.avgAge = this.organisms.length ? ageSum / this.organisms.length : 0;
    this.stats.avgEnergy = this.organisms.length ? energySum / this.organisms.length : 0;

    if (maxGen > this.stats.maxGeneration) {
      this.stats.maxGeneration = maxGen;
      if (maxGen <= 10 || maxGen % 10 === 0) this.emit(`Generation ${maxGen} に到達`, 'milestone');
    }
    if (this.tick % 20 === 0) this.pushHistory();
    if (this.tick % 300 === 0 && this.organisms.length > 0) this.emit(`Population ${this.organisms.length} / 平均Energy ${this.stats.avgEnergy.toFixed(1)}`);
  }

  pushHistory() {
    this.stats.history.push({ tick: this.tick, population: this.organisms.length, generation: this.stats.maxGeneration, avgAge: this.stats.avgAge, avgEnergy: this.stats.avgEnergy });
    if (this.stats.history.length > 600) this.stats.history.shift();
  }
}

class WorldRenderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); }
  render(sim, selectedId) {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#050b08'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(125,255,178,.055)'; ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    for (const food of sim.food) {
      ctx.beginPath(); ctx.arc(food.x, food.y, food.size, 0, TAU); ctx.fillStyle = '#ffe66d'; ctx.fill();
    }

    for (const life of sim.organisms) {
      const selected = life.id === selectedId;
      if (selected) {
        ctx.beginPath(); ctx.arc(life.x, life.y, life.genome.vision, 0, TAU); ctx.strokeStyle = 'rgba(125,255,178,.16)'; ctx.stroke();
      }
      ctx.save(); ctx.translate(life.x, life.y); ctx.rotate(life.dir);
      ctx.beginPath(); ctx.moveTo(8.5, 0); ctx.lineTo(-6.5, 5.5); ctx.lineTo(-4.5, 0); ctx.lineTo(-6.5, -5.5); ctx.closePath();
      ctx.fillStyle = `hsl(${life.genome.hue} 78% ${selected ? 68 : 57}%)`; ctx.fill();
      if (selected) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke(); }
      ctx.restore();
    }
  }
  pick(sim, clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * this.canvas.width / rect.width;
    const y = (clientY - rect.top) * this.canvas.height / rect.height;
    let best = null, bestD2 = 16 * 16;
    for (const life of sim.organisms) {
      const dx = life.x - x, dy = life.y - y, d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = life; }
    }
    return best;
  }
}

class BrainRenderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); }
  render(life) {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#08110d'; ctx.fillRect(0, 0, w, h);
    if (!life || !life.brain.activations.length) return;
    const acts = life.brain.activations, positions = [];
    for (let c = 0; c < acts.length; c++) {
      const n = acts[c].length, x = 34 + c * ((w - 68) / (acts.length - 1)), col = [];
      for (let i = 0; i < n; i++) col.push({ x, y: n === 1 ? h / 2 : 22 + i * ((h - 44) / (n - 1)) });
      positions.push(col);
    }
    ctx.lineWidth = .65;
    for (let c = 0; c < positions.length - 1; c++) {
      const inN = positions[c].length, outN = positions[c + 1].length, weights = life.brain.weights[c];
      for (let j = 0; j < outN; j++) for (let i = 0; i < inN; i++) {
        const weight = weights[j * inN + i], alpha = clamp(Math.abs(weight) * 0.16, .02, .22);
        ctx.strokeStyle = weight >= 0 ? `rgba(125,255,178,${alpha})` : `rgba(255,107,122,${alpha})`;
        ctx.beginPath(); ctx.moveTo(positions[c][i].x, positions[c][i].y); ctx.lineTo(positions[c + 1][j].x, positions[c + 1][j].y); ctx.stroke();
      }
    }
    for (let c = 0; c < positions.length; c++) for (let i = 0; i < positions[c].length; i++) {
      const value = acts[c][i], normalized = c === positions.length - 1 ? clamp(value, 0, 1) : clamp((value + 1) / 2, 0, 1);
      ctx.beginPath(); ctx.arc(positions[c][i].x, positions[c][i].y, 3.5 + normalized * 3.8, 0, TAU);
      ctx.fillStyle = `rgba(125,255,178,${0.18 + normalized * 0.82})`; ctx.fill();
    }
    ctx.fillStyle = '#8fa79b'; ctx.font = '10px ui-sans-serif, system-ui'; ctx.fillText('SENSORS', 10, 13); ctx.fillText('ACTIONS', w - 58, 13);
    ['MOVE', 'LEFT', 'RIGHT', 'EAT'].forEach((label, i) => {
      const p = positions[positions.length - 1][i]; ctx.fillText(label, p.x - 12, Math.min(h - 5, p.y + 15));
    });
  }
}

class StatsRenderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); }
  render(history) {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#0a1511'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.055)'; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) { const y = i * h / 5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    if (history.length < 2) return;
    const maxPop = Math.max(10, ...history.map(d => d.population)), maxGen = Math.max(1, ...history.map(d => d.generation));
    const drawLine = (key, max, stroke) => {
      ctx.beginPath();
      history.forEach((d, i) => {
        const x = i / (history.length - 1) * (w - 30) + 15, y = h - 18 - (d[key] / max) * (h - 36);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
    };
    drawLine('population', maxPop, '#7dffb2'); drawLine('generation', maxGen, '#5bc6ff');
    ctx.fillStyle = '#8fa79b'; ctx.font = '11px ui-sans-serif, system-ui';
    ctx.fillText(`Population max ${maxPop}`, 14, 15); ctx.fillText(`Generation max ${maxGen}`, w - 138, 15);
  }
}

const ui = {
  worldCanvas: document.getElementById('worldCanvas'), brainCanvas: document.getElementById('brainCanvas'), statsCanvas: document.getElementById('statsCanvas'),
  startBtn: document.getElementById('startBtn'), pauseBtn: document.getElementById('pauseBtn'), resetBtn: document.getElementById('resetBtn'),
  speedSelect: document.getElementById('speedSelect'), exportBtn: document.getElementById('exportBtn'), eventLog: document.getElementById('eventLog'),
  extinctionOverlay: document.getElementById('extinctionOverlay'), emptyInspector: document.getElementById('emptyInspector'), inspectorContent: document.getElementById('inspectorContent')
};

const worldRenderer = new WorldRenderer(ui.worldCanvas), brainRenderer = new BrainRenderer(ui.brainCanvas), statsRenderer = new StatsRenderer(ui.statsCanvas);
let sim, running = true, selectedId = null, frameCount = 0, extinctionLogged = false;

function readSettings() {
  const val = id => document.getElementById(id).value;
  return {
    initialPopulation: clamp(parseInt(val('initialPopulation'), 10) || 120, 10, 600),
    initialFood: clamp(parseInt(val('initialFood'), 10) || 320, 10, 1200),
    maxFood: clamp(parseInt(val('maxFood'), 10) || 500, 50, 2000),
    foodEnergy: clamp(parseFloat(val('foodEnergy')) || 48, 5, 150),
    foodSpawn: clamp(parseFloat(val('foodSpawn')) || 0.18, 0, 1),
    mutationRate: clamp(parseFloat(val('mutationRate')) || 0.08, 0, 1),
    mutationStrength: clamp(parseFloat(val('mutationStrength')) || 0.18, 0, 1),
    reproductionThreshold: clamp(parseFloat(val('reproductionThreshold')) || 155, 80, 300),
    seed: String(val('seedInput') || 'emergence-001')
  };
}

function logEvent(evt) {
  const row = document.createElement('div');
  row.className = `log-row ${evt.type === 'milestone' ? 'milestone' : evt.type === 'warning' ? 'warning' : ''}`;
  row.innerHTML = `<time>${String(evt.tick).padStart(6, '0')}</time><strong>${evt.message}</strong>`;
  ui.eventLog.prepend(row);
  while (ui.eventLog.children.length > 80) ui.eventLog.removeChild(ui.eventLog.lastChild);
}

function resetSimulation() {
  ui.eventLog.innerHTML = '';
  sim = new Simulation(ui.worldCanvas.width, ui.worldCanvas.height, readSettings(), logEvent);
  selectedId = null; extinctionLogged = false; running = true; ui.extinctionOverlay.classList.add('hidden'); updateUI();
}
function selectedLife() { return selectedId == null ? null : sim.organisms.find(o => o.id === selectedId) || null; }

function updateUI() {
  document.getElementById('populationStat').textContent = sim.organisms.length;
  document.getElementById('generationStat').textContent = sim.stats.maxGeneration;
  document.getElementById('tickStat').textContent = sim.tick.toLocaleString();
  document.getElementById('birthsStat').textContent = sim.stats.births.toLocaleString();
  document.getElementById('deathsStat').textContent = sim.stats.deaths.toLocaleString();
  document.getElementById('foodStat').textContent = sim.stats.foodConsumed.toLocaleString();
  document.getElementById('seedStat').textContent = sim.settings.seed;
  const life = selectedLife();
  if (!life) {
    selectedId = null; document.getElementById('selectedTitle').textContent = '個体未選択';
    ui.emptyInspector.classList.remove('hidden'); ui.inspectorContent.classList.add('hidden'); brainRenderer.render(null);
  } else {
    document.getElementById('selectedTitle').textContent = `Life #${life.id}`;
    ui.emptyInspector.classList.add('hidden'); ui.inspectorContent.classList.remove('hidden');
    document.getElementById('lifeGeneration').textContent = life.generation;
    document.getElementById('lifeAge').textContent = life.age.toLocaleString();
    document.getElementById('lifeEnergy').textContent = life.energy.toFixed(1);
    document.getElementById('lifeChildren').textContent = life.children;
    document.getElementById('lifeFood').textContent = life.foodEaten;
    document.getElementById('lifeAction').textContent = life.lastAction;
    document.getElementById('lifeSpeed').textContent = life.genome.speed.toFixed(2);
    document.getElementById('lifeVision').textContent = life.genome.vision.toFixed(0);
    document.getElementById('energyFill').style.width = `${clamp(life.energy / 200 * 100, 0, 100)}%`;
    brainRenderer.render(life);
  }
  worldRenderer.render(sim, selectedId); statsRenderer.render(sim.stats.history);
}

function stepsPerFrame() {
  const value = ui.speedSelect.value;
  if (value === 'max') return 80;
  const n = Number(value);
  if (n === 0.5) return frameCount % 2 === 0 ? 1 : 0;
  return Math.max(1, Math.round(n));
}

function loop() {
  frameCount++;
  if (running && sim.organisms.length > 0) {
    const steps = stepsPerFrame();
    for (let i = 0; i < steps; i++) { sim.step(); if (sim.organisms.length === 0) break; }
  }
  if (sim.organisms.length === 0) {
    running = false; ui.extinctionOverlay.classList.remove('hidden');
    if (!extinctionLogged) { logEvent({ tick: sim.tick, message: '全個体が死亡しました', type: 'warning' }); extinctionLogged = true; }
  }
  if (frameCount % 3 === 0 || !running) updateUI(); else worldRenderer.render(sim, selectedId);
  requestAnimationFrame(loop);
}

ui.startBtn.addEventListener('click', () => { if (sim.organisms.length > 0) { running = true; ui.extinctionOverlay.classList.add('hidden'); } });
ui.pauseBtn.addEventListener('click', () => { running = false; updateUI(); });
ui.resetBtn.addEventListener('click', resetSimulation);
ui.worldCanvas.addEventListener('click', e => { const life = worldRenderer.pick(sim, e.clientX, e.clientY); selectedId = life ? life.id : null; updateUI(); });
ui.exportBtn.addEventListener('click', () => {
  const payload = {
    exportedAt: new Date().toISOString(), settings: sim.settings, tick: sim.tick,
    statistics: { population: sim.organisms.length, births: sim.stats.births, deaths: sim.stats.deaths, foodConsumed: sim.stats.foodConsumed, maxGeneration: sim.stats.maxGeneration, avgAge: sim.stats.avgAge, avgEnergy: sim.stats.avgEnergy, history: sim.stats.history },
    organisms: sim.organisms.map(o => ({ id: o.id, generation: o.generation, parentId: o.parentId, age: o.age, energy: o.energy, children: o.children, foodEaten: o.foodEaten, speed: o.genome.speed, vision: o.genome.vision, efficiency: o.genome.efficiency }))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = `artificial-life-${sim.settings.seed}-${sim.tick}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

resetSimulation();
requestAnimationFrame(loop);
