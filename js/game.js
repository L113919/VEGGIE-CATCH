
"use strict";

// ========================================
// VEGGIE CATCH - GAME CONFIGURATION
// ========================================

const FOOD = {
    lettuce: {
        src: "assets/images/lettuce.png",
        points: 10,
        color: "#60a96b"
    },

    tomato: {
        src: "assets/images/tomato.png",
        points: 10,
        color: "#dc594e"
    },

    carrot: {
        src: "assets/images/carrot.png",
        points: 10,
        color: "#ed983d"
    },

    burger: {
        src: "assets/images/burger.png",
        points: -15,
        color: "#bc824b"
    }
};

// ========================================
// HTML ELEMENTS
// ========================================

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreNode = document.querySelector("#score");
const timeNode = document.querySelector("#time");
const bestNode = document.querySelector("#best");

const overlay = document.querySelector("#overlay");
const headline = document.querySelector("#headline");
const message = document.querySelector("#message");
const play = document.querySelector("#play");

const pauseButton = document.querySelector("#pause");
const endButton = document.querySelector("#end");

// ========================================
// GAME SETTINGS
// ========================================

const W = canvas.width;
const H = canvas.height;

const DURATION = 30;
const FOOD_SIZE = 48;

ctx.imageSmoothingEnabled = false;

// ========================================
// LOAD FOOD IMAGES
// ========================================

const sprites = {};

for (const [name, food] of Object.entries(FOOD)) {

    const img = new Image();

    sprites[name] = {
        img: img,
        ready: false
    };

    img.onload = () => {
        sprites[name].ready = true;
        draw();
    };

    img.onerror = () => {
        sprites[name].ready = false;
        console.warn("Unable to load image:", food.src);
    };

    img.src = food.src;
}

// ========================================
// BEST SCORE
// ========================================

let best = 0;

try {
    best = Number(
        localStorage.getItem("veggieCatchBest")
    ) || 0;
} catch (error) {
    best = 0;
}

bestNode.textContent = best;

// ========================================
// GAME VARIABLES
// ========================================

let score = 0;

let items = [];
let popups = [];

let active = false;
let paused = false;

let elapsed = 0;
let spawnClock = 0;

let lastTime = 0;
let frameId = 0;

// ========================================
// PIXEL DRAWING HELPER
// ========================================

function pixel(x, y, width, height, color) {

    ctx.fillStyle = color;

    ctx.fillRect(
        Math.round(x),
        Math.round(y),
        width,
        height
    );
}

// ========================================
// DRAW FOOD IMAGES
// ========================================

function drawFood(item) {

    const sprite = sprites[item.type];

    if (!sprite || !sprite.ready) {
        return;
    }

    const image = sprite.img;

    const scale = Math.min(
        item.size / image.naturalWidth,
        item.size / image.naturalHeight
    );

    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;

    const x = item.x - width / 2;
    const y = item.y - height / 2;

    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
        image,
        Math.round(x),
        Math.round(y),
        Math.round(width),
        Math.round(height)
    );
}

// ========================================
// DRAW GAME BACKGROUND
// ========================================

function drawBackground() {

    // Main background
    pixel(0, 0, W, H, "#e9e3cc");

    // Small decorative pixels
    for (let x = 8; x < W; x += 36) {

        for (let y = 8; y < H; y += 36) {

            pixel(
                x,
                y,
                2,
                2,
                "#d9d4b9"
            );
        }
    }

    // Grass floor
    pixel(
        0,
        H - 22,
        W,
        22,
        "#a2c592"
    );

    pixel(
        0,
        H - 22,
        W,
        5,
        "#719c70"
    );
}

// ========================================
// DRAW SCORE POPUPS
// ========================================

function drawPopups() {

    ctx.textAlign = "center";
    ctx.font = "bold 18px monospace";

    for (const popup of popups) {

        ctx.globalAlpha = Math.max(
            0,
            popup.life
        );

        ctx.fillStyle = popup.color;

        ctx.fillText(
            popup.text,
            popup.x,
            popup.y
        );
    }

    ctx.globalAlpha = 1;
}

// ========================================
// MAIN DRAW FUNCTION
// ========================================

function draw() {

    ctx.clearRect(0, 0, W, H);

    drawBackground();

    for (const item of items) {
        drawFood(item);
    }

    drawPopups();
}

// ========================================
// SPAWN FALLING FOOD
// ========================================

function spawn() {

    const names = Object.keys(FOOD);

    const type = names[
        Math.floor(Math.random() * names.length)
    ];

    const item = {
        type: type,

        x: 26 + Math.random() * (W - 52),

        y: -30,

        size: FOOD_SIZE,

        speed: 95 + Math.random() * 50 + elapsed * 2.3,

        phase: Math.random() * 7
    };

    items.push(item);
}

// ========================================
// GAME LOOP
// ========================================

function loop(timestamp) {

    if (!active || paused) {
        return;
    }

    const dt = Math.min(
        (timestamp - lastTime) / 1000,
        0.05
    );

    lastTime = timestamp;

    elapsed = Math.min(
        DURATION,
        elapsed + dt
    );

    // Update timer
    timeNode.textContent = Math.ceil(
        DURATION - elapsed
    );

    // Spawn food
    spawnClock += dt;

    const interval = Math.max(
        0.28,
        0.65 - elapsed * 0.008
    );

    while (spawnClock >= interval) {

        spawnClock -= interval;

        spawn();
    }

    // Move food
    for (const item of items) {

        item.y += item.speed * dt;

        item.x += Math.sin(
            timestamp * 0.003 + item.phase
        ) * 0.3;
    }

    // Remove food outside canvas
    items = items.filter(
        item => item.y < H + 35
    );

    // Animate score popups
    for (const popup of popups) {

        popup.y -= dt * 55;

        popup.life -= dt * 1.5;
    }

    popups = popups.filter(
        popup => popup.life > 0
    );

    draw();

    // Game over
    if (elapsed >= DURATION) {

        finish(false);

        return;
    }

    frameId = requestAnimationFrame(loop);
}

// ========================================
// FINISH GAME
// ========================================

function finish(endedEarly = false) {

    if (!active) {
        return;
    }

    active = false;
    paused = false;

    cancelAnimationFrame(frameId);

    pauseButton.disabled = true;
    endButton.disabled = true;

    pauseButton.textContent = "PAUSE ⏸";

    // Update best score
    if (score > best) {

        best = score;

        try {

            localStorage.setItem(
                "veggieCatchBest",
                String(best)
            );

        } catch (error) {
            console.warn("Could not save best score.");
        }
    }

    bestNode.textContent = best;

    headline.textContent = endedEarly
        ? "GAME ENDED!"
        : "TIME UP!";

    message.textContent =
        `Final score: ${score} • Best: ${best}`;

    play.textContent = "PLAY AGAIN ↻";

    overlay.hidden = false;
}

// ========================================
// START GAME
// ========================================

function start() {

    cancelAnimationFrame(frameId);

    score = 0;

    items = [];
    popups = [];

    elapsed = 0;
    spawnClock = 0;

    active = true;
    paused = false;

    scoreNode.textContent = "0";
    timeNode.textContent = DURATION;

    pauseButton.disabled = false;
    endButton.disabled = false;

    pauseButton.textContent = "PAUSE ⏸";

    overlay.hidden = true;

    lastTime = performance.now();

    draw();

    frameId = requestAnimationFrame(loop);
}

// ========================================
// TOUCH / MOUSE CONTROLS
// ========================================

canvas.addEventListener("pointerdown", event => {

    if (!active || paused) {
        return;
    }

    event.preventDefault();

    const rect = canvas.getBoundingClientRect();

    const x = (
        event.clientX - rect.left
    ) * W / rect.width;

    const y = (
        event.clientY - rect.top
    ) * H / rect.height;

    // Check clicked food
    for (let n = items.length - 1; n >= 0; n--) {

        const item = items[n];

        const distanceX = Math.abs(item.x - x);
        const distanceY = Math.abs(item.y - y);

        const hitSize = item.size / 2 + 4;

        if (
            distanceX < hitSize &&
            distanceY < hitSize
        ) {

            const food = FOOD[item.type];

            // Update score
            score = Math.max(
                0,
                score + food.points
            );

            scoreNode.textContent = score;

            // Floating score animation
            popups.push({

                x: item.x,
                y: item.y,

                life: 1,

                text: food.points > 0
                    ? `+${food.points}`
                    : String(food.points),

                color: food.points > 0
                    ? "#38864d"
                    : "#bb4d42"
            });

            // Remove clicked food
            items.splice(n, 1);

            draw();

            break;
        }
    }
});

// ========================================
// PAUSE / RESUME GAME
// ========================================

function resumeGame() {

    if (!active || !paused) {
        return;
    }

    paused = false;

    pauseButton.textContent = "PAUSE ⏸";

    overlay.hidden = true;

    lastTime = performance.now();

    frameId = requestAnimationFrame(loop);
}

pauseButton.addEventListener("click", () => {

    if (!active) {
        return;
    }

    if (paused) {

        resumeGame();

    } else {

        paused = true;

        cancelAnimationFrame(frameId);

        pauseButton.textContent = "RESUME ▶";

        headline.textContent = "PAUSED";

        message.textContent = "Take your time!";

        play.textContent = "RESUME ▶";

        overlay.hidden = false;
    }
});

// ========================================
// END GAME BUTTON
// ========================================

endButton.addEventListener("click", () => {

    finish(true);
});

// ========================================
// START / RESTART BUTTON
// ========================================

play.addEventListener("click", () => {

    if (active && paused) {

        resumeGame();

    } else {

        start();
    }
});

// ========================================
// INITIAL SCREEN
// ========================================

draw();
