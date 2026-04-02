const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const starsValue = document.getElementById("starsValue");
const timeValue = document.getElementById("timeValue");
const levelValue = document.getElementById("levelValue");
const playerLevelValue = document.getElementById("playerLevelValue");
const bankValue = document.getElementById("bankValue");
const startOverlay = document.getElementById("startOverlay");
const endOverlay = document.getElementById("endOverlay");
const summaryText = document.getElementById("summaryText");
const bonusStarsInput = document.getElementById("bonusStars");
const roundEarnedValue = document.getElementById("roundEarnedValue");
const nextBankValue = document.getElementById("nextBankValue");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const joystickZone = document.getElementById("joystickZone");
const joystickKnob = document.getElementById("joystickKnob");
const heroGrid = document.getElementById("heroGrid");

const STORAGE_KEY = "forest-study-trail-save-v1";
const CELL_SIZE = 48;
const MAZE_TOP = 0;
const PLAYER_SPEED = 3.6;
const ENEMY_BASE_SPEED = 2.4;
const ROUND_TIME = 90;
const JOYSTICK_LIMIT = 44;
const PLAYER_RADIUS = 16;
const ENEMY_RADIUS = 15;

const HEROES = [
  {
    id: "meerkat",
    name: "Meerkat",
    color: "#d9a066",
    accent: "#4b3425",
    unlockCost: 0,
    speed: 1,
    face: { eye: "#4b3425", blush: "#f7c59f", mouth: "smile", nose: "#5b3a29" },
  },
  {
    id: "raccoon",
    name: "Raccoon",
    color: "#8d99ae",
    accent: "#1f2937",
    unlockCost: 20,
    speed: 1.04,
    face: { eye: "#1f2937", blush: "#d7e3fc", mouth: "happy", nose: "#1f2937" },
  },
  {
    id: "panda",
    name: "Panda",
    color: "#f8f9fa",
    accent: "#1f2937",
    unlockCost: 35,
    speed: 1.07,
    face: { eye: "#111827", blush: "#e5e7eb", mouth: "happy", nose: "#111827" },
  },
  {
    id: "dog",
    name: "Dog",
    color: "#c08457",
    accent: "#4a2f20",
    unlockCost: 50,
    speed: 1.1,
    face: { eye: "#4a2f20", blush: "#efc7a8", mouth: "smile", nose: "#2f1b12" },
  },
];

const BASE_MAZE = [
  "#####################",
  "#o........#........o#",
  "#.###.###.#.###.###.#",
  "#.....#...#...#.....#",
  "#.###.#.#####.#.###.#",
  "#...#...P.....#...#.#",
  "###.#.###.###.#.#.#.#",
  "#...#.....#...#.#...#",
  "#.#####.#.#.###.###.#",
  "#.....#.#...#.....Z.#",
  "#o###...###...###..o#",
  "#####################",
];

const DIRECTION_VECTORS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};

const ZOMBIE_LANES = [
  { row: 3, minCol: 3, maxCol: 6, speed: 2.2 },
  { row: 7, minCol: 5, maxCol: 7, speed: 2.35 },
  { row: 7, minCol: 15, maxCol: 18, speed: 2.5 },
];

const progress = loadProgress();
const initialHero = HEROES.find((hero) => hero.id === progress.selectedHeroId) || HEROES[0];

const game = {
  running: false,
  timeLeft: ROUND_TIME,
  stars: 0,
  startBank: 0,
  level: 1,
  lastFrame: 0,
  pelletsLeft: 0,
  selectedHeroId: progress.selectedHeroId,
  player: createMover(0, 0, PLAYER_RADIUS),
  enemies: [],
  maze: [],
  playerSpawn: { x: 0, y: 0 },
  enemySpawns: [],
};

game.player.speed = PLAYER_SPEED * initialHero.speed;

const input = {
  queuedDirection: "left",
  touchX: 0,
  touchY: 0,
};

function createMover(gridX, gridY, radius) {
  return {
    x: gridX * CELL_SIZE + CELL_SIZE / 2,
    y: MAZE_TOP + gridY * CELL_SIZE + CELL_SIZE / 2,
    radius,
    direction: "left",
    nextDirection: "left",
    speed: PLAYER_SPEED,
  };
}

function loadProgress() {
  const fallback = {
    bank: 0,
    unlockedHeroIds: ["meerkat"],
    selectedHeroId: "meerkat",
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw);
    return {
      bank: Number(saved.bank) || 0,
      unlockedHeroIds: Array.isArray(saved.unlockedHeroIds) && saved.unlockedHeroIds.length > 0 ? saved.unlockedHeroIds : fallback.unlockedHeroIds,
      selectedHeroId: typeof saved.selectedHeroId === "string" ? saved.selectedHeroId : fallback.selectedHeroId,
    };
  } catch {
    return fallback;
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getPlayerLevel() {
  return 1 + Math.floor(progress.bank / 10);
}

function getSelectedHero() {
  return HEROES.find((hero) => hero.id === game.selectedHeroId) || HEROES[0];
}

function isHeroUnlocked(heroId) {
  return progress.unlockedHeroIds.includes(heroId);
}

function unlockAvailableHeroes() {
  if (!progress.unlockedHeroIds.includes("meerkat")) {
    progress.unlockedHeroIds.push("meerkat");
  }

  for (const hero of HEROES) {
    if (progress.bank >= hero.unlockCost && !isHeroUnlocked(hero.id)) {
      progress.unlockedHeroIds.push(hero.id);
    }
  }

  if (!isHeroUnlocked(progress.selectedHeroId)) {
    progress.selectedHeroId = "meerkat";
  }
}

function renderHeroPicker() {
  heroGrid.innerHTML = "";

  for (const hero of HEROES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hero-card";

    const unlocked = isHeroUnlocked(hero.id);
    if (!unlocked) button.classList.add("locked");
    if (game.selectedHeroId === hero.id) button.classList.add("selected");

    button.innerHTML = `
      <span class="hero-avatar" style="background:${hero.color}">
        ${getHeroAvatarMarkup(hero)}
      </span>
      <span class="hero-name">${hero.name}</span>
      <span class="hero-cost">${unlocked ? (game.selectedHeroId === hero.id ? "Selected" : "Tap to use") : `Unlock at ${hero.unlockCost} stars`}</span>
    `;

    button.disabled = !unlocked;
    button.addEventListener("click", () => {
      game.selectedHeroId = hero.id;
      progress.selectedHeroId = hero.id;
      saveProgress();
      renderHeroPicker();
      render();
    });

    heroGrid.appendChild(button);
  }
}

function cloneMaze() {
  game.maze = BASE_MAZE.map((row) => row.split(""));
  game.enemySpawns = [];
  game.pelletsLeft = 0;

  for (let row = 0; row < game.maze.length; row += 1) {
    for (let col = 0; col < game.maze[row].length; col += 1) {
      const cell = game.maze[row][col];
      if (cell === "P") {
        game.playerSpawn = { x: col, y: row };
        game.maze[row][col] = " ";
      } else if (cell === "Z") {
        game.enemySpawns.push({ x: col, y: row });
        game.maze[row][col] = " ";
      } else if (cell === "." || cell === "o") {
        game.pelletsLeft += 1;
      }
    }
  }
}

function resetPositions() {
  game.player = createMover(game.playerSpawn.x, game.playerSpawn.y, PLAYER_RADIUS);
  game.player.speed = PLAYER_SPEED * getSelectedHero().speed;
  game.player.direction = input.queuedDirection;
  game.player.nextDirection = input.queuedDirection;

  const enemy = createMover(9, 10, ENEMY_RADIUS);
  enemy.direction = "up";
  enemy.nextDirection = "up";
  enemy.speed = ENEMY_BASE_SPEED + Math.min(game.level * 0.1, 0.8);
  enemy.skin = "#7fcf63";
  enemy.shirt = "#1d3557";
  enemy.mode = "chaser";
  enemy.stepTimer = 0;
  game.enemies = [enemy];
}

function resetGame() {
  game.running = false;
  game.timeLeft = ROUND_TIME;
  game.startBank = progress.bank;
  game.stars = 0;
  game.level = 1;
  game.lastFrame = 0;
  cloneMaze();
  resetPositions();
  updateHud();
}

function updateHud() {
  starsValue.textContent = String(game.stars);
  timeValue.textContent = String(Math.ceil(game.timeLeft));
  levelValue.textContent = String(game.level);
  playerLevelValue.textContent = String(getPlayerLevel());
  bankValue.textContent = String(progress.bank);
}

function clampBonusInput() {
  const value = clamp(Number(bonusStarsInput.value) || 0, 0, 20);
  bonusStarsInput.value = String(value);
  return value;
}

function updateProjectedBank() {
  const bonus = clampBonusInput();
  nextBankValue.textContent = String(game.startBank + game.stars + bonus);
}

function tileAt(col, row) {
  return game.maze[row]?.[col] ?? "#";
}

function getGridPosition(entity) {
  return {
    col: Math.round((entity.x - CELL_SIZE / 2) / CELL_SIZE),
    row: Math.round((entity.y - MAZE_TOP - CELL_SIZE / 2) / CELL_SIZE),
  };
}

function isCentered(entity) {
  const centerX = (Math.round((entity.x - CELL_SIZE / 2) / CELL_SIZE) * CELL_SIZE) + CELL_SIZE / 2;
  const centerY = (Math.round((entity.y - MAZE_TOP - CELL_SIZE / 2) / CELL_SIZE) * CELL_SIZE) + CELL_SIZE / 2;
  return Math.abs(entity.x - centerX) < 3 && Math.abs(entity.y - centerY) < 3;
}

function canMove(entity, direction) {
  const vector = DIRECTION_VECTORS[direction];
  const { col, row } = getGridPosition(entity);
  return tileAt(col + vector.x, row + vector.y) !== "#";
}

function snapToGrid(entity) {
  const { col, row } = getGridPosition(entity);
  entity.x = col * CELL_SIZE + CELL_SIZE / 2;
  entity.y = MAZE_TOP + row * CELL_SIZE + CELL_SIZE / 2;
}

function moveEntity(entity, dt) {
  if (isCentered(entity)) {
    snapToGrid(entity);
    if (canMove(entity, entity.nextDirection)) {
      entity.direction = entity.nextDirection;
    }
    if (!canMove(entity, entity.direction)) {
      return;
    }
  }

  const vector = DIRECTION_VECTORS[entity.direction];
  entity.x += vector.x * entity.speed * CELL_SIZE * dt;
  entity.y += vector.y * entity.speed * CELL_SIZE * dt;
}

function updateEnemyLane(enemy, dt) {
  const minX = enemy.lane.minCol * CELL_SIZE + CELL_SIZE / 2;
  const maxX = enemy.lane.maxCol * CELL_SIZE + CELL_SIZE / 2;
  const laneSpeed = (enemy.lane.speed + Math.min(game.level * 0.08, 0.5)) * CELL_SIZE;

  enemy.x += enemy.vx * laneSpeed * dt;
  enemy.y = enemy.lane.row * CELL_SIZE + CELL_SIZE / 2;

  if (enemy.x <= minX) {
    enemy.x = minX;
    enemy.vx = 1;
  }

  if (enemy.x >= maxX) {
    enemy.x = maxX;
    enemy.vx = -1;
  }
}

function chooseChaserDirection(enemy) {
  const here = getGridPosition(enemy);
  const target = getGridPosition(game.player);
  const startKey = `${here.col},${here.row}`;
  const targetKey = `${target.col},${target.row}`;
  const queue = [{ col: here.col, row: here.row }];
  const visited = new Set([startKey]);
  const firstStep = new Map();

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = `${current.col},${current.row}`;

    if (currentKey === targetKey) {
      enemy.nextDirection = firstStep.get(currentKey) || enemy.direction;
      return;
    }

    for (const [direction, vector] of Object.entries(DIRECTION_VECTORS)) {
      const nextCol = current.col + vector.x;
      const nextRow = current.row + vector.y;
      const key = `${nextCol},${nextRow}`;

      if (visited.has(key) || tileAt(nextCol, nextRow) === "#") {
        continue;
      }

      visited.add(key);
      firstStep.set(key, firstStep.get(currentKey) || direction);
      queue.push({ col: nextCol, row: nextRow });
    }
  }

  enemy.nextDirection = enemy.direction;
}

function updateChaser(enemy, dt) {
  enemy.stepTimer += dt;

  if (enemy.stepTimer < 0.8) {
    return;
  }

  enemy.stepTimer = 0;
  chooseChaserDirection(enemy);

  const vector = DIRECTION_VECTORS[enemy.nextDirection];
  const here = getGridPosition(enemy);
  const nextCol = here.col + vector.x;
  const nextRow = here.row + vector.y;

  if (tileAt(nextCol, nextRow) === "#") {
    return;
  }

  enemy.direction = enemy.nextDirection;
  enemy.x = nextCol * CELL_SIZE + CELL_SIZE / 2;
  enemy.y = nextRow * CELL_SIZE + CELL_SIZE / 2;
}

function collectPellet() {
  const { col, row } = getGridPosition(game.player);
  const cell = tileAt(col, row);

  if (cell === "." || cell === "o") {
    game.maze[row][col] = " ";
    game.pelletsLeft -= 1;
    game.stars += cell === "o" ? 3 : 1;
    updateHud();
  }

  if (game.pelletsLeft <= 0) {
    game.level += 1;
    cloneMaze();
    resetPositions();
  }
}

function hitEnemy() {
  game.timeLeft = Math.max(0, game.timeLeft - 10);
  if (game.timeLeft <= 0) {
    endRound();
    return;
  }
  resetPositions();
}

function circleHit(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius;
}

function update(dt) {
  game.timeLeft -= dt;
  if (game.timeLeft <= 0) {
    endRound();
    return;
  }

  game.player.nextDirection = input.queuedDirection;
  moveEntity(game.player, dt);
  collectPellet();

  for (const enemy of game.enemies) {
    if (enemy.mode === "chaser") {
      updateChaser(enemy, dt);
    } else {
      updateEnemyLane(enemy, dt);
    }

    if (circleHit(enemy, game.player)) {
      hitEnemy();
      return;
    }
  }

  updateHud();
}

function drawMaze() {
  ctx.fillStyle = "#dfeecf";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < game.maze.length; row += 1) {
    for (let col = 0; col < game.maze[row].length; col += 1) {
      const x = col * CELL_SIZE;
      const y = MAZE_TOP + row * CELL_SIZE;
      const cell = game.maze[row][col];

      if (cell === "#") {
        ctx.fillStyle = "#5d8a47";
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = "#3d5f30";
        ctx.beginPath();
        ctx.arc(x + 14, y + 14, 12, 0, Math.PI * 2);
        ctx.arc(x + 33, y + 16, 11, 0, Math.PI * 2);
        ctx.arc(x + 23, y + 30, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#7b4f2a";
        ctx.fillRect(x + 20, y + 28, 6, 12);
      } else if (cell === "." || cell === "o") {
        ctx.fillStyle = "#efe3c0";
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        drawCollectible(cell, x, y);
      } else {
        ctx.fillStyle = "#efe3c0";
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
      }
    }
  }
}

function drawCollectible(cell, x, y) {
  if (cell === ".") {
    ctx.fillStyle = "#f28482";
    ctx.fillRect(x + 20, y + 18, 8, 12);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 18, y + 16, 12, 4);
    ctx.fillStyle = "#7f5539";
    ctx.fillRect(x + 22, y + 30, 4, 5);
    return;
  }

  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(x + 24, y + 24, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff4b5";
  ctx.beginPath();
  ctx.arc(x + 24, y + 24, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#e09f3e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 24, y + 11);
  ctx.lineTo(x + 24, y + 5);
  ctx.stroke();
}

function drawHeroFace(x, y, hero, scale = 1) {
  if (hero.id === "meerkat") {
    ctx.fillStyle = "#f4d7b4";
    ctx.beginPath();
    ctx.ellipse(x, y + 4 * scale, 8.5 * scale, 10 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (hero.id === "raccoon") {
    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.ellipse(x, y - 1 * scale, 12 * scale, 7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.ellipse(x, y + 5 * scale, 8 * scale, 6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (hero.id === "panda") {
    ctx.fillStyle = "#f3f4f6";
    ctx.beginPath();
    ctx.ellipse(x, y + 5 * scale, 10 * scale, 7.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (hero.id === "dog") {
    ctx.fillStyle = "#f2d1b3";
    ctx.beginPath();
    ctx.ellipse(x, y + 4 * scale, 10 * scale, 7 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = hero.face.eye;
  ctx.beginPath();
  ctx.arc(x - 6 * scale, y - 2 * scale, 2.4 * scale, 0, Math.PI * 2);
  ctx.arc(x + 6 * scale, y - 2 * scale, 2.4 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hero.face.nose;
  ctx.beginPath();
  if (hero.id === "panda") {
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.ellipse(x - 6 * scale, y - 2 * scale, 4.5 * scale, 5.5 * scale, -0.2, 0, Math.PI * 2);
    ctx.ellipse(x + 6 * scale, y - 2 * scale, 4.5 * scale, 5.5 * scale, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (hero.id === "panda") {
    ctx.moveTo(x, y + 4.5 * scale);
    ctx.lineTo(x - 3.5 * scale, y + 8 * scale);
    ctx.lineTo(x + 3.5 * scale, y + 8 * scale);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.arc(x, y + 5 * scale, hero.id === "meerkat" ? 2.4 * scale : 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = hero.face.eye;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  if (hero.id === "dog") {
    ctx.arc(x, y + 8 * scale, 5 * scale, 0.2, Math.PI - 0.2);
  } else if (hero.id === "meerkat") {
    ctx.arc(x, y + 8 * scale, 4.5 * scale, 0.25, Math.PI - 0.25);
  } else {
    ctx.arc(x, y + 9 * scale, 5.5 * scale, 0.2, Math.PI - 0.2);
  }
  ctx.stroke();

  if (hero.id === "panda") {
    ctx.lineWidth = 1.3 * scale;
    ctx.beginPath();
    ctx.moveTo(x - 3 * scale, y + 9 * scale);
    ctx.lineTo(x, y + 11 * scale);
    ctx.lineTo(x + 3 * scale, y + 9 * scale);
    ctx.stroke();
  }
}

function drawHeroEars(x, y, hero, scale = 1) {
  if (hero.id === "panda") {
    ctx.fillStyle = hero.color;
    ctx.beginPath();
    ctx.moveTo(x - 9 * scale, y - 8 * scale);
    ctx.lineTo(x - 15 * scale, y - 19 * scale);
    ctx.lineTo(x - 3 * scale, y - 15 * scale);
    ctx.closePath();
    ctx.moveTo(x + 9 * scale, y - 8 * scale);
    ctx.lineTo(x + 15 * scale, y - 19 * scale);
    ctx.lineTo(x + 3 * scale, y - 15 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(x - 9 * scale, y - 10 * scale);
    ctx.lineTo(x - 12 * scale, y - 16 * scale);
    ctx.lineTo(x - 6 * scale, y - 13 * scale);
    ctx.closePath();
    ctx.moveTo(x + 9 * scale, y - 10 * scale);
    ctx.lineTo(x + 12 * scale, y - 16 * scale);
    ctx.lineTo(x + 6 * scale, y - 13 * scale);
    ctx.closePath();
    ctx.fill();
  } else if (hero.id === "dog") {
    ctx.fillStyle = "#9a6b47";
    ctx.beginPath();
    ctx.ellipse(x - 14 * scale, y - 3 * scale, 5 * scale, 10 * scale, 0.45, 0, Math.PI * 2);
    ctx.ellipse(x + 14 * scale, y - 3 * scale, 5 * scale, 10 * scale, -0.45, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = hero.color;
    ctx.beginPath();
    ctx.arc(x - 9 * scale, y - 13 * scale, 4.5 * scale, 0, Math.PI * 2);
    ctx.arc(x + 9 * scale, y - 13 * scale, 4.5 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  if (hero.id === "raccoon") {
    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.ellipse(x, y - 3 * scale, 13 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function getHeroAvatarMarkup(hero) {
  if (hero.id === "meerkat") {
    return `
      <span class="avatar-ear round left"></span>
      <span class="avatar-ear round right"></span>
      <span class="avatar-snout light"></span>
      <span class="avatar-eye left" style="background:${hero.face.eye}"></span>
      <span class="avatar-eye right" style="background:${hero.face.eye}"></span>
      <span class="avatar-nose round" style="background:${hero.face.nose}"></span>
      <span class="avatar-mouth smile" style="color:${hero.face.eye}"></span>
    `;
  }

  if (hero.id === "raccoon") {
    return `
      <span class="avatar-ear round left dark"></span>
      <span class="avatar-ear round right dark"></span>
      <span class="avatar-mask"></span>
      <span class="avatar-snout pale"></span>
      <span class="avatar-eye left" style="background:${hero.face.eye}"></span>
      <span class="avatar-eye right" style="background:${hero.face.eye}"></span>
      <span class="avatar-nose round small" style="background:${hero.face.nose}"></span>
      <span class="avatar-mouth smile" style="color:${hero.face.eye}"></span>
    `;
  }

  if (hero.id === "panda") {
    return `
      <span class="avatar-ear triangle left"></span>
      <span class="avatar-ear triangle right"></span>
      <span class="avatar-patch left"></span>
      <span class="avatar-patch right"></span>
      <span class="avatar-snout pale"></span>
      <span class="avatar-eye left" style="background:${hero.face.eye}"></span>
      <span class="avatar-eye right" style="background:${hero.face.eye}"></span>
      <span class="avatar-nose triangle small" style="border-bottom-color:${hero.face.nose}"></span>
      <span class="avatar-mouth smile" style="color:${hero.face.eye}"></span>
    `;
  }

  return `
    <span class="avatar-ear floppy left"></span>
    <span class="avatar-ear floppy right"></span>
    <span class="avatar-snout light"></span>
      <span class="avatar-eye left" style="background:${hero.face.eye}"></span>
    <span class="avatar-eye right" style="background:${hero.face.eye}"></span>
    <span class="avatar-nose round" style="background:${hero.face.nose}"></span>
    <span class="avatar-mouth smile" style="color:${hero.face.eye}"></span>
  `;
}

function drawPlayer() {
  const hero = getSelectedHero();

  drawHeroEars(game.player.x, game.player.y, hero);
  ctx.fillStyle = hero.color;
  ctx.beginPath();
  ctx.arc(game.player.x, game.player.y, game.player.radius, 0, Math.PI * 2);
  ctx.fill();

  drawHeroFace(game.player.x, game.player.y, hero);
}

function drawEnemies() {
  for (const enemy of game.enemies) {
    ctx.fillStyle = enemy.skin;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y - 2, enemy.radius - 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = enemy.shirt;
    ctx.fillRect(enemy.x - 11, enemy.y + 6, 22, 10);

    ctx.fillStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.arc(enemy.x - 5, enemy.y - 5, 4, 0, Math.PI * 2);
    ctx.arc(enemy.x + 5, enemy.y - 5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#264653";
    ctx.beginPath();
    ctx.arc(enemy.x - 4, enemy.y - 4, 2, 0, Math.PI * 2);
    ctx.arc(enemy.x + 4, enemy.y - 4, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#264653";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y + 1, 6, 0.15, Math.PI - 0.15);
    ctx.stroke();

    ctx.strokeStyle = "#486b1b";
    ctx.beginPath();
    ctx.moveTo(enemy.x - 7, enemy.y + 16);
    ctx.lineTo(enemy.x - 7, enemy.y + 20);
    ctx.moveTo(enemy.x, enemy.y + 16);
    ctx.lineTo(enemy.x, enemy.y + 20);
    ctx.moveTo(enemy.x + 7, enemy.y + 16);
    ctx.lineTo(enemy.x + 7, enemy.y + 20);
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(enemy.x - 6, enemy.y + 10, 3, 4);
    ctx.fillRect(enemy.x - 1, enemy.y + 10, 3, 4);
    ctx.fillRect(enemy.x + 4, enemy.y + 10, 3, 4);
    ctx.fill();
  }
}

function drawCenterBanner() {
  if (game.running) return;

  ctx.fillStyle = "rgba(255, 230, 80, 0.95)";
  ctx.font = "700 18px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("READY!", canvas.width / 2, canvas.height / 2 + 14);
}

function render() {
  drawMaze();
  drawEnemies();
  drawPlayer();
  drawCenterBanner();
}

function gameLoop(timestamp) {
  if (!game.running) return;

  if (game.lastFrame === 0) {
    game.lastFrame = timestamp;
  }

  const dt = Math.min((timestamp - game.lastFrame) / 1000, 0.032);
  game.lastFrame = timestamp;

  update(dt);
  render();

  if (game.running) {
    requestAnimationFrame(gameLoop);
  }
}

function startRound() {
  resetGame();
  startOverlay.classList.add("hidden");
  endOverlay.classList.add("hidden");
  game.running = true;
  render();
  requestAnimationFrame(gameLoop);
}

function endRound() {
  game.running = false;
  roundEarnedValue.textContent = String(game.stars);
  summaryText.textContent = `You reached Wave ${game.level} and collected ${game.stars} stars on the forest trail while escaping the forest goblins. Add an optional study bonus, then bank them to unlock more animal friends.`;
  bonusStarsInput.value = "0";
  updateProjectedBank();
  endOverlay.classList.remove("hidden");
  render();
  updateHud();
}

function bankRoundRewards() {
  const bonus = clampBonusInput();
  progress.bank += game.stars + bonus;
  unlockAvailableHeroes();

  if (!isHeroUnlocked(progress.selectedHeroId)) {
    progress.selectedHeroId = "meerkat";
    game.selectedHeroId = "meerkat";
  }

  saveProgress();
  renderHeroPicker();
  updateHud();
  updateProjectedBank();
}

function setDirection(direction) {
  input.queuedDirection = direction;
}

function setKeyState(code) {
  if (code === "ArrowLeft" || code === "KeyA") setDirection("left");
  if (code === "ArrowRight" || code === "KeyD") setDirection("right");
  if (code === "ArrowUp" || code === "KeyW") setDirection("up");
  if (code === "ArrowDown" || code === "KeyS") setDirection("down");
}

function resetJoystick() {
  input.touchX = 0;
  input.touchY = 0;
  joystickKnob.style.transform = "translate(0px, 0px)";
}

function handleJoystick(clientX, clientY) {
  const bounds = joystickZone.getBoundingClientRect();
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  const distance = Math.min(Math.hypot(dx, dy), JOYSTICK_LIMIT);
  const angle = Math.atan2(dy, dx);
  const knobX = Math.cos(angle) * distance;
  const knobY = Math.sin(angle) * distance;

  input.touchX = knobX / JOYSTICK_LIMIT;
  input.touchY = knobY / JOYSTICK_LIMIT;
  joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

  if (Math.abs(knobX) > Math.abs(knobY)) {
    setDirection(knobX < 0 ? "left" : "right");
  } else {
    setDirection(knobY < 0 ? "up" : "down");
  }
}

document.addEventListener("keydown", (event) => setKeyState(event.code));

joystickZone.addEventListener("pointerdown", (event) => {
  joystickZone.setPointerCapture(event.pointerId);
  handleJoystick(event.clientX, event.clientY);
});

joystickZone.addEventListener("pointermove", (event) => {
  if (event.pressure > 0) {
    handleJoystick(event.clientX, event.clientY);
  }
});

joystickZone.addEventListener("pointerup", resetJoystick);
joystickZone.addEventListener("pointercancel", resetJoystick);

startButton.addEventListener("click", startRound);
restartButton.addEventListener("click", () => {
  bankRoundRewards();
  startRound();
});
bonusStarsInput.addEventListener("input", updateProjectedBank);

unlockAvailableHeroes();
game.selectedHeroId = progress.selectedHeroId;
renderHeroPicker();
cloneMaze();
resetPositions();
updateProjectedBank();
updateHud();
render();
