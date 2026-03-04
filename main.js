const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const powerFill = document.getElementById('power-bar-fill');
const scoreEl = document.getElementById('score');
const comboEl = document.getElementById('combo');
const overlay = document.getElementById('overlay');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const hearts = document.querySelectorAll('.heart');

// 환경 설정
const WIDTH = 800;
const HEIGHT = 400;
const BALL_RADIUS = 12;
const POCKET_RADIUS = 22;
const FRICTION = 0.988;
const MIN_SPEED = 0.15;

canvas.width = WIDTH;
canvas.height = HEIGHT;

let balls = [];
let cueBall;
let isDragging = false;
let dragStartX, dragStartY;
let mouseX, mouseY;
let score = 0;
let combo = 1;
let lives = 3;
let gameState = 'play'; // 'play', 'moving', 'gameover'

class Ball {
    constructor(x, y, color, number = 0, isCue = false) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.number = number;
        this.isCue = isCue;
        this.inPocket = false;
        this.opacity = 1;
    }

    draw() {
        if (this.inPocket && this.opacity <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;

        // 테이블 위의 그림자
        ctx.beginPath();
        ctx.arc(this.x + 4, this.y + 4, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        // 공 본체 (3D 구체 입체감)
        const grad = ctx.createRadialGradient(
            this.x - BALL_RADIUS * 0.4, this.y - BALL_RADIUS * 0.4, BALL_RADIUS * 0.1,
            this.x, this.y, BALL_RADIUS
        );
        grad.addColorStop(0, '#ffffff'); // 하이라이트
        grad.addColorStop(0.3, this.color); // 기본 색상
        grad.addColorStop(1, '#000000'); // 외곽 그림자

        ctx.beginPath();
        ctx.arc(this.x, this.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // 번호 및 광택 효과
        if (!this.isCue && this.number > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, BALL_RADIUS * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fill();
            
            ctx.fillStyle = '#111';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.number, this.x, this.y);
        }

        // 표면 광택
        ctx.beginPath();
        ctx.ellipse(this.x - BALL_RADIUS * 0.3, this.y - BALL_RADIUS * 0.3, BALL_RADIUS * 0.3, BALL_RADIUS * 0.2, Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();

        ctx.restore();
    }

    update() {
        if (this.inPocket) {
            this.opacity -= 0.1;
            return;
        }

        this.x += this.vx;
        this.y += this.vy;

        // 마찰력
        this.vx *= FRICTION;
        this.vy *= FRICTION;

        if (Math.abs(this.vx) < MIN_SPEED) this.vx = 0;
        if (Math.abs(this.vy) < MIN_SPEED) this.vy = 0;

        // 벽 충돌
        if (this.x - BALL_RADIUS < 0 || this.x + BALL_RADIUS > WIDTH) {
            this.vx *= -0.8;
            this.x = this.x < BALL_RADIUS ? BALL_RADIUS : WIDTH - BALL_RADIUS;
        }
        if (this.y - BALL_RADIUS < 0 || this.y + BALL_RADIUS > HEIGHT) {
            this.vy *= -0.8;
            this.y = this.y < BALL_RADIUS ? BALL_RADIUS : HEIGHT - BALL_RADIUS;
        }

        // 구멍 체크
        checkPocket(this);
    }
}

function drawCue(cueBall, mx, my) {
    const dx = cueBall.x - mx;
    const dy = cueBall.y - my;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);
    const power = Math.min(dist / 10, 25);

    ctx.save();
    ctx.translate(cueBall.x, cueBall.y);
    ctx.rotate(angle);

    // 큐대 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(-power * 3 - 260, 10, 250, 6);

    // 큐대 몸체
    // 팁 (검은색)
    ctx.fillStyle = '#333';
    ctx.fillRect(-power * 3 - 10, -3, 10, 6);
    
    // 앞부분 (밝은 나무색)
    ctx.fillStyle = '#f3e5ab';
    ctx.fillRect(-power * 3 - 90, -4, 80, 8);
    
    // 뒷부분 그라데이션 (진한 나무색)
    const cueGrad = ctx.createLinearGradient(-power * 3 - 260, 0, -power * 3 - 90, 0);
    cueGrad.addColorStop(0, '#3e2723');
    cueGrad.addColorStop(1, '#5d4037');
    ctx.fillStyle = cueGrad;
    
    ctx.beginPath();
    ctx.moveTo(-power * 3 - 90, -4);
    ctx.lineTo(-power * 3 - 260, -7);
    ctx.lineTo(-power * 3 - 260, 7);
    ctx.lineTo(-power * 3 - 90, 4);
    ctx.fill();

    ctx.restore();
}

function initGame() {
    balls = [];
    score = 0;
    combo = 1;
    lives = 3;
    gameState = 'play';
    scoreEl.textContent = '0';
    comboEl.textContent = 'x1';
    overlay.classList.add('hidden');
    updateHearts();

    // 수구 생성
    cueBall = new Ball(WIDTH * 0.25, HEIGHT / 2, '#fff', 0, true);
    balls.push(cueBall);

    // 목적구 생성 (삼각형 배치)
    const colors = ['#f1c40f', '#2980b9', '#e74c3c', '#8e44ad', '#d35400', '#27ae60', '#c0392b', '#2c3e50'];
    const startX = WIDTH * 0.7;
    const startY = HEIGHT / 2;
    let ballNum = 1;

    for (let i = 0; i < 4; i++) {
        for (let j = 0; j <= i; j++) {
            const x = startX + i * (BALL_RADIUS * 2);
            const y = startY - (i * BALL_RADIUS) + (j * BALL_RADIUS * 2);
            balls.push(new Ball(x, y, colors[ballNum % colors.length], ballNum));
            ballNum++;
        }
    }
}

// 사운드 엔진 (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playHitSound(volume = 0.5) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800 + Math.random() * 200, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(volume * 0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}

function playPocketSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
}

function checkPocket(ball) {
    const pockets = [
        {x: 0, y: 0}, {x: WIDTH/2, y: 0}, {x: WIDTH, y: 0},
        {x: 0, y: HEIGHT}, {x: WIDTH/2, y: HEIGHT}, {x: WIDTH, y: HEIGHT}
    ];

    for (let p of pockets) {
        const dist = Math.hypot(ball.x - p.x, ball.y - p.y);
        if (dist < POCKET_RADIUS) {
            ball.inPocket = true;
            ball.vx = 0;
            ball.vy = 0;
            
            // 소리 재생
            playPocketSound();
            
            if (ball.isCue) {
                handleFoul();
            } else {
                handleScore();
            }
            break;
        }
    }
}

function handleScore() {
    score += 100 * combo;
    combo++;
    scoreEl.textContent = score;
    comboEl.textContent = `x${combo}`;
}

function handleFoul() {
    lives--;
    combo = 1;
    comboEl.textContent = `x1`;
    updateHearts();

    if (lives <= 0) {
        gameOver();
    } else {
        setTimeout(() => {
            cueBall.inPocket = false;
            cueBall.opacity = 1;
            cueBall.x = WIDTH * 0.25;
            cueBall.y = HEIGHT / 2;
            cueBall.vx = 0;
            cueBall.vy = 0;
        }, 1000);
    }
}

function updateHearts() {
    hearts.forEach((h, i) => {
        h.style.opacity = i < lives ? '1' : '0.2';
    });
}

function gameOver() {
    gameState = 'gameover';
    finalScoreEl.textContent = score;
    overlay.classList.remove('hidden');
}

function resolveCollision(b1, b2) {
    if (b1.inPocket || b2.inPocket) return;

    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const dist = Math.hypot(dx, dy);

    if (dist < BALL_RADIUS * 2) {
        const angle = Math.atan2(dy, dx);
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        let x1 = 0, y1 = 0;
        let x2 = dx * cos + dy * sin;
        let y2 = dy * cos - dx * sin;

        let vx1 = b1.vx * cos + b1.vy * sin;
        let vy1 = b1.vy * cos - b1.vx * sin;
        let vx2 = b2.vx * cos + b2.vy * sin;
        let vy2 = b2.vy * cos - b2.vx * sin;

        let vxTotal = vx1 - vx2;
        vx1 = vx2;
        vx2 = vxTotal + vx1;

        // 타격음 재생 (충돌 속도에 비례)
        const relativeSpeed = Math.abs(vxTotal);
        if (relativeSpeed > 0.5) {
            playHitSound(Math.min(relativeSpeed / 10, 1.0));
        }

        const overlap = (BALL_RADIUS * 2 - dist) / 2;
        x1 -= overlap;
        x2 += overlap;

        b1.vx = vx1 * cos - vy1 * sin;
        b1.vy = vy1 * cos + vx1 * sin;
        b2.vx = vx2 * cos - vy2 * sin;
        b2.vy = vy2 * cos + vx2 * sin;

        b1.x += x1 * cos - y1 * sin;
        b1.y += y1 * cos + x1 * sin;
        b2.x += x2 * cos - y2 * sin;
        b2.y += y2 * cos + x2 * sin;
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // 테이블 구멍 그리기
    ctx.fillStyle = '#111';
    const pockets = [
        {x: 0, y: 0}, {x: WIDTH/2, y: 0}, {x: WIDTH, y: 0},
        {x: 0, y: HEIGHT}, {x: WIDTH/2, y: HEIGHT}, {x: WIDTH, y: HEIGHT}
    ];
    pockets.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    });

    const isMoving = balls.some(b => Math.abs(b.vx) > 0.1 || Math.abs(b.vy) > 0.1);
    if (!isMoving && gameState === 'moving') {
        gameState = 'play';
        if (balls.filter(b => !b.isCue && !b.inPocket).length === 0) {
            initGame();
        }
    }

    for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
            resolveCollision(balls[i], balls[j]);
        }
    }

    balls.forEach(ball => {
        ball.update();
        ball.draw();
    });

    if (gameState === 'play' && isDragging) {
        const dx = cueBall.x - mouseX;
        const dy = cueBall.y - mouseY;
        const dist = Math.hypot(dx, dy);
        const power = Math.min(dist / 10, 25);
        
        powerFill.style.height = `${(power / 25) * 100}%`;

        drawCue(cueBall, mouseX, mouseY);

        // 가이드 라인
        ctx.beginPath();
        ctx.moveTo(cueBall.x, cueBall.y);
        const angle = Math.atan2(dy, dx);
        ctx.lineTo(cueBall.x + Math.cos(angle) * 150, cueBall.y + Math.sin(angle) * 150);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
    } else {
        powerFill.style.height = '0%';
    }

    requestAnimationFrame(gameLoop);
}

const getMousePos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * (WIDTH / rect.width),
        y: (clientY - rect.top) * (HEIGHT / rect.height)
    };
};

const handleStart = (e) => {
    if (gameState !== 'play') return;
    const pos = getMousePos(e);
    isDragging = true;
    mouseX = pos.x;
    mouseY = pos.y;
};

const handleMove = (e) => {
    if (!isDragging) return;
    const pos = getMousePos(e);
    mouseX = pos.x;
    mouseY = pos.y;
};

const handleEnd = () => {
    if (!isDragging) return;
    isDragging = false;

    const dx = cueBall.x - mouseX;
    const dy = cueBall.y - mouseY;
    const dist = Math.hypot(dx, dy);
    const power = Math.min(dist / 10, 25);

    if (power > 1) {
        const angle = Math.atan2(dy, dx);
        cueBall.vx = Math.cos(angle) * power;
        cueBall.vy = Math.sin(angle) * power;
        gameState = 'moving';
    }
};

canvas.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', handleEnd);
canvas.addEventListener('touchstart', handleStart);
window.addEventListener('touchmove', handleMove);
window.addEventListener('touchend', handleEnd);
restartBtn.addEventListener('click', initGame);

initGame();
gameLoop();
