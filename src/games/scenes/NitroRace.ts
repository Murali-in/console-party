import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';

interface NitroConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }>;
}

interface CarState {
  sprite: Phaser.GameObjects.Rectangle;
  angle: number;
  speed: number;
  laps: number;
  checkpoint: number;
  nitroActive: boolean;
  nitroCooldown: number;
  nitroTimer: number;
  playerId: string;
  playerName: string;
  color: number;
}

export default class NitroRaceScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: NitroConfig['onGameOver'];
  private inputMap: NitroConfig['inputMap'];
  private cars: CarState[] = [];
  private checkpoints: Phaser.Geom.Rectangle[] = [];
  private hudTexts: Phaser.GameObjects.Text[] = [];
  private trackGraphics!: Phaser.GameObjects.Graphics;
  private totalLaps = 3;
  private finished = false;

  constructor(config: NitroConfig) {
    super({ key: 'NitroRace' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    // Draw oval track
    this.trackGraphics = this.add.graphics();
    this.trackGraphics.lineStyle(60, 0x16162a, 1);
    const cx = w / 2, cy = h / 2, rx = w * 0.35, ry = h * 0.32;
    this.trackGraphics.strokeEllipse(cx, cy, rx * 2, ry * 2);

    // Track border lines
    this.trackGraphics.lineStyle(2, 0x6c63ff, 0.15);
    this.trackGraphics.strokeEllipse(cx, cy, rx * 2 + 60, ry * 2 + 60);
    this.trackGraphics.strokeEllipse(cx, cy, rx * 2 - 60, ry * 2 - 60);

    // Checkpoints (invisible zones around the track)
    const cpCount = 4;
    for (let i = 0; i < cpCount; i++) {
      const a = (i / cpCount) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * rx;
      const py = cy + Math.sin(a) * ry;
      this.checkpoints.push(new Phaser.Geom.Rectangle(px - 30, py - 30, 60, 60));

      // Visual marker
      this.trackGraphics.lineStyle(1, 0x6c63ff, 0.3);
      this.trackGraphics.strokeRect(px - 30, py - 30, 60, 60);
    }

    // Start/finish line
    const startX = cx + rx;
    const startY = cy;
    this.trackGraphics.lineStyle(3, 0xfbbf24, 0.6);
    this.trackGraphics.lineBetween(startX, startY - 35, startX, startY + 35);

    // Spawn cars at start
    this.roomPlayers.forEach((p, i) => {
      const startAngle = -Math.PI / 2;
      const offset = (i - (this.roomPlayers.length - 1) / 2) * 20;
      const sx = cx + Math.cos(startAngle) * rx;
      const sy = cy + Math.sin(startAngle) * ry + offset;

      const carColor = Phaser.Display.Color.HexStringToColor(p.color).color;
      const sprite = this.add.rectangle(sx, sy, 24, 14, carColor);

      this.cars.push({
        sprite,
        angle: 0,
        speed: 0,
        laps: 0,
        checkpoint: 0,
        nitroActive: false,
        nitroCooldown: 0,
        nitroTimer: 0,
        playerId: p.id,
        playerName: p.name,
        color: carColor,
      });
    });

    // HUD
    this.roomPlayers.forEach((p, i) => {
      const txt = this.add.text(16, 16 + i * 18, '', {
        fontSize: '11px', fontFamily: 'JetBrains Mono', color: p.color,
      });
      this.hudTexts.push(txt);
    });
  }

  update(_time: number, delta: number) {
    if (this.finished) return;

    const dt = delta / 1000;
    const TURN_SPEED = 3.5;
    const MAX_SPEED = 280;
    const ACCEL = 8;
    const FRICTION = 0.94;

    this.cars.forEach((car, idx) => {
      const inp = this.inputMap[car.playerId] || { x: 0, y: 0, buttonA: false, buttonB: false };

      // Nitro
      if (inp.buttonB && car.nitroCooldown <= 0 && !car.nitroActive) {
        car.nitroActive = true;
        car.nitroTimer = 2000;
        car.nitroCooldown = 5000;
      }
      if (car.nitroActive) {
        car.nitroTimer -= delta;
        if (car.nitroTimer <= 0) car.nitroActive = false;
      }
      if (car.nitroCooldown > 0) car.nitroCooldown -= delta;

      // Acceleration
      const maxSpd = MAX_SPEED * (car.nitroActive ? 1.8 : 1);
      if (inp.y < -0.2) {
        car.speed = Math.min(car.speed + ACCEL, maxSpd);
      } else if (inp.y > 0.2) {
        car.speed = Math.max(car.speed - ACCEL * 1.5, -MAX_SPEED * 0.4);
      } else {
        car.speed *= FRICTION;
      }

      // Steering
      if (Math.abs(car.speed) > 10) {
        car.angle += inp.x * TURN_SPEED * Math.sign(car.speed);
      }

      // Move
      const rad = Phaser.Math.DegToRad(car.angle - 90);
      car.sprite.x += Math.cos(rad) * car.speed * dt;
      car.sprite.y += Math.sin(rad) * car.speed * dt;
      car.sprite.setAngle(car.angle);

      // Clamp to game area
      const w = Number(this.game.config.width);
      const h = Number(this.game.config.height);
      car.sprite.x = Phaser.Math.Clamp(car.sprite.x, 20, w - 20);
      car.sprite.y = Phaser.Math.Clamp(car.sprite.y, 20, h - 20);

      // Nitro visual
      if (car.nitroActive) {
        car.sprite.setFillStyle(0xfbbf24);
      } else {
        car.sprite.setFillStyle(car.color);
      }

      // Checkpoint detection
      const nextCp = car.checkpoint % this.checkpoints.length;
      if (this.checkpoints[nextCp].contains(car.sprite.x, car.sprite.y)) {
        car.checkpoint++;
        if (car.checkpoint > 0 && car.checkpoint % this.checkpoints.length === 0) {
          car.laps++;
          if (car.laps >= this.totalLaps) {
            this.finishRace(car);
          }
        }
      }

      // HUD update
      if (this.hudTexts[idx]) {
        const nitroStr = car.nitroActive ? ' ⚡' : '';
        this.hudTexts[idx].setText(`${car.playerName}: Lap ${Math.min(car.laps + 1, this.totalLaps)}/${this.totalLaps}${nitroStr}`);
      }
    });
  }

  finishRace(winner: CarState) {
    this.finished = true;
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    this.add.text(w / 2, h / 2, `${winner.playerName} wins!`, {
      fontSize: '28px', fontFamily: 'Syne', color: '#6c63ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const scores: Record<string, number> = {};
    this.cars.forEach(c => { scores[c.playerName] = c.laps; });

    this.time.delayedCall(3000, () => {
      this.onGameOver(winner.playerName, scores);
    });
  }
}
