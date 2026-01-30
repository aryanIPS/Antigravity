/**
 * Cosmic Defender - Game Engine
 */

const CONFIG = {
    PLAYER_SPEED: 400,
    PLAYER_WIDTH: 40,
    PLAYER_HEIGHT: 40,
    PLAYER_COLOR: '#00ff88',
    BULLET_SPEED: 800,
    BULLET_WIDTH: 4,
    BULLET_HEIGHT: 15,
    BULLET_COLOR: '#ffff00',
    BULLET_COOLDOWN: 0.15,
    ENEMY_BASE_SPEED: 150,
    ENEMY_SIZE: 35,
    ENEMY_COLOR: '#ff3366',
    SPAWN_RATE_INITIAL: 1.2,
};

// --- Utils ---
function rectIntersect(r1, r2) {
    return !(r2.left > r1.right || 
             r2.right < r1.left || 
             r2.top > r1.bottom || 
             r2.bottom < r1.top);
}

// --- Classes ---

class InputHandler {
    constructor() {
        this.keys = { ArrowLeft: false, ArrowRight: false, Space: false };

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') this.keys.Space = true;
            if (e.code === 'ArrowLeft') this.keys.ArrowLeft = true;
            if (e.code === 'ArrowRight') this.keys.ArrowRight = true;
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') this.keys.Space = false;
            if (e.code === 'ArrowLeft') this.keys.ArrowLeft = false;
            if (e.code === 'ArrowRight') this.keys.ArrowRight = false;
        });
        
        // Touch support
        window.addEventListener('touchstart', (e) => {
             const touchX = e.touches[0].clientX;
             const width = window.innerWidth;
             if (touchX < width / 2) {
                 this.keys.ArrowLeft = true;
                 this.keys.ArrowRight = false;
             } else {
                 this.keys.ArrowRight = true;
                 this.keys.ArrowLeft = false;
             }
             this.keys.Space = true; 
        });
        
        window.addEventListener('touchend', () => {
             this.keys.ArrowLeft = false;
             this.keys.ArrowRight = false;
             this.keys.Space = false;
        });
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 2;
        const speed = Math.random() * 100 + 50;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 3 + 2;
        this.markedForDeletion = false;
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= this.decay * dt;
        if (this.life <= 0) this.markedForDeletion = true;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.BULLET_WIDTH;
        this.height = CONFIG.BULLET_HEIGHT;
        this.markedForDeletion = false;
    }

    update(dt) {
        this.y -= CONFIG.BULLET_SPEED * dt;
        if (this.y + this.height < 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.BULLET_COLOR;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    getBounds() {
        return { 
            left: this.x, 
            right: this.x + this.width, 
            top: this.y, 
            bottom: this.y + this.height 
        };
    }
}

class Enemy {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = CONFIG.ENEMY_SIZE;
        this.height = CONFIG.ENEMY_SIZE;
        this.speed = CONFIG.ENEMY_BASE_SPEED + (game.difficulty * 10);
        this.markedForDeletion = false;
    }

    update(dt) {
        this.y += this.speed * dt;
        if (this.y > this.game.height + 50) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.ENEMY_COLOR;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Inner detail
        ctx.fillStyle = '#aa0033';
        ctx.fillRect(this.x + 8, this.y + 8, this.width - 16, this.height - 16);
    }

    getBounds() {
        return { 
            left: this.x + 2, 
            right: this.x + this.width - 2, 
            top: this.y + 2, 
            bottom: this.y + this.height - 2 
        };
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.width = CONFIG.PLAYER_WIDTH;
        this.height = CONFIG.PLAYER_HEIGHT;
        this.x = 0;
        this.y = 0;
        this.cooldownTimer = 0;
    }

    reset() {
        // Center player at bottom
        this.x = this.game.width / 2 - this.width / 2;
        this.y = this.game.height - this.height - 20;
        this.cooldownTimer = 0;
    }

    update(dt) {
        // Movement
        if (this.game.input.keys.ArrowLeft) {
            this.x -= CONFIG.PLAYER_SPEED * dt;
        }
        if (this.game.input.keys.ArrowRight) {
            this.x += CONFIG.PLAYER_SPEED * dt;
        }

        // Screen Clamp
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > this.game.width) this.x = this.game.width - this.width;

        // Shooting
        if (this.cooldownTimer > 0) this.cooldownTimer -= dt;
        if (this.game.input.keys.Space && this.cooldownTimer <= 0) {
            this.shoot();
        }
    }

    shoot() {
        // Spawn bullet at center top of player
        const bx = this.x + this.width / 2 - CONFIG.BULLET_WIDTH / 2;
        const by = this.y;
        this.game.bullets.push(new Bullet(bx, by));
        this.cooldownTimer = CONFIG.BULLET_COOLDOWN;
    }

    draw(ctx) {
        ctx.fillStyle = CONFIG.PLAYER_COLOR;
        
        // Draw Triangle Ship
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
    }

    getBounds() {
        return { 
            left: this.x + 5, 
            right: this.x + this.width - 5, 
            top: this.y + 5, 
            bottom: this.y + this.height - 5 
        };
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.ui = {
            score: document.getElementById('score-value'),
            finalScore: document.getElementById('final-score'),
            startScreen: document.getElementById('start-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            startBtn: document.getElementById('start-btn'),
            restartBtn: document.getElementById('restart-btn')
        };
        
        this.ui.startBtn.addEventListener('click', () => this.start());
        this.ui.restartBtn.addEventListener('click', () => this.start());

        this.input = new InputHandler();
        
        this.width = 0;
        this.height = 0;
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.player = new Player(this);
        
        // Game State
        this.state = 'MENU';
        this.lastTime = 0;
        this.score = 0;
        this.difficulty = 0;
        
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        
        this.spawnTimer = 0;

        // Start Loop
        requestAnimationFrame((ts) => this.loop(ts));
    }

    resize() {
        this.width = this.canvas.clientWidth;
        this.height = this.canvas.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        if (this.player && this.state !== 'MENU') {
            // Keep player inside if resized
            if (this.player.x > this.width) this.player.x = this.width - this.player.width;
            if (this.player.y < 50) this.player.y = this.height - 60; // Just in case
        }
    }

    start() {
        this.state = 'PLAYING';
        this.score = 0;
        this.difficulty = 0;
        this.spawnTimer = 0;
        
        // FULL RESET
        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        
        this.player.reset();
        
        this.ui.startScreen.classList.add('hidden');
        this.ui.gameOverScreen.classList.add('hidden');
        this.updateScoreUI();
        
        this.lastTime = performance.now();
    }

    gameOver() {
        this.state = 'GAMEOVER';
        this.ui.finalScore.textContent = this.score;
        this.ui.gameOverScreen.classList.remove('hidden');
    }

    createExplosion(x, y, color) {
        for(let i=0; i<15; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    update(dt) {
        if (this.state !== 'PLAYING') return;

        // Difficulty increases over time
        this.difficulty += dt * 0.1;

        // Entities Update
        this.player.update(dt);
        
        this.bullets.forEach(b => b.update(dt));
        this.bullets = this.bullets.filter(b => !b.markedForDeletion);
        
        this.enemies.forEach(e => e.update(dt));
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => !p.markedForDeletion);

        // Enemy Spawning
        this.spawnTimer += dt;
        let currentSpawnRate = Math.max(0.3, CONFIG.SPAWN_RATE_INITIAL - (this.difficulty * 0.05));
        
        if (this.spawnTimer > currentSpawnRate) {
            this.spawnTimer = 0;
            const x = Math.random() * (this.width - CONFIG.ENEMY_SIZE);
            this.enemies.push(new Enemy(this, x, -CONFIG.ENEMY_SIZE));
        }

        // Check Collisions
        this.checkCollisions();
    }

    checkCollisions() {
        const pBounds = this.player.getBounds();
        
        // 1. Check Player vs Enemies (GAME OVER condition)
        for (const enemy of this.enemies) {
            if (rectIntersect(pBounds, enemy.getBounds())) {
                this.createExplosion(this.player.x + 20, this.player.y + 20, CONFIG.PLAYER_COLOR);
                this.gameOver();
                return; // Stop update immediately on game over
            }
        }
        
        // 2. Check Bullets vs Enemies (SCORE condition)
        for (const bullet of this.bullets) {
            for (const enemy of this.enemies) {
                if (rectIntersect(bullet.getBounds(), enemy.getBounds())) {
                    // Collision Detected
                    bullet.markedForDeletion = true;
                    enemy.markedForDeletion = true;
                    
                    // FX
                    this.createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, CONFIG.ENEMY_COLOR);
                    
                    // Score
                    this.score += 10;
                    this.updateScoreUI();
                    
                    break; // Bullet hits one enemy only
                }
            }
        }
    }

    updateScoreUI() {
        this.ui.score.textContent = this.score;
    }

    draw() {
        if (this.state === 'MENU') return;

        // Clear
        this.ctx.fillStyle = '#050508';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Simple Starfield
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        if (Math.random() < 0.2) {
             this.ctx.fillRect(Math.random()*this.width, Math.random()*this.height, 2, 2);
        }

        // Draw Entities
        this.player.draw(this.ctx);
        this.bullets.forEach(b => b.draw(this.ctx));
        this.enemies.forEach(e => e.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));
    }

    loop(timestamp) {
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // Safety Cap
        if (dt > 0.1) dt = 0.1;

        this.update(dt);
        this.draw();

        requestAnimationFrame((ts) => this.loop(ts));
    }
}

// Start
window.addEventListener('load', () => new Game());
