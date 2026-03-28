import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playNitroBoost, playLapComplete, playVictory } from '@/games/SoundFX';

interface NitroConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean; buttonX: boolean; buttonY: boolean; holdTime: number }>;
}

interface CarState {
  sprite: Phaser.GameObjects.Container;
  bodyRect: Phaser.GameObjects.Rectangle;
  flameFx: Phaser.GameObjects.Rectangle;
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
  trailPoints: { x: number; y: number; age: number }[];
}

export default class NitroRaceScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: NitroConfig['onGameOver'];
  private inputMap: NitroConfig['inputMap'];
  private cars: CarState[] = [];
  private checkpoints: Phaser.Geom.Rectangle[] = [];
  private hudTexts: Phaser.GameObjects.Text[] = [];
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private totalLaps = 3;
  private finished = false;
  private raceStarted = false;
  private preRaceTimer = 2000;
  private cx = 0;
  private cy = 0;
  private rx = 0;
  private ry = 0;
  private trackInnerRx = 0;
  private trackInnerRy = 0;
  private trackOuterRx = 0;
  private trackOuterRy = 0;

  constructor(config: NitroConfig) {
    super({ key: 'NitroRace' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.cx = w / 2;
    this.cy = h / 2;
    this.rx = w * 0.36;
    this.ry = h * 0.33;

    const trackWidth = 72;
    this.trackInnerRx = this.rx - trackWidth / 2;
    this.trackInnerRy = this.ry - trackWidth / 2;
    this.trackOuterRx = this.rx + trackWidth / 2;
    this.trackOuterRy = this.ry + trackWidth / 2;

    // Track rendering
    const trackG = this.add.graphics();
    trackG.lineStyle(trackWidth, 0x16162a, 1);
    trackG.strokeEllipse(this.cx, this.cy, this.rx * 2, this.ry * 2);
    trackG.lineStyle(1, 0x6c63ff, 0.1);
    trackG.strokeEllipse(this.cx, this.cy, this.rx * 2, this.ry * 2);
    trackG.lineStyle(1, 0x6c63ff, 0.06);
    trackG.strokeEllipse(this.cx, this.cy, this.trackOuterRx * 2, this.trackOuterRy * 2);
    trackG.strokeEllipse(this.cx, this.cy, this.trackInnerRx * 2, this.trackInnerRy * 2);

    // Dashed center line
    const dashG = this.add.graphics();
    dashG.lineStyle(1, 0xffffff, 0.06);
    for (let a = 0; a < Math.PI * 2; a += 0.08) {
      if (Math.floor(a / 0.08) % 3 === 0) continue;
      const x1 = this.cx + Math.cos(a) * this.rx;
      const y1 = this.cy + Math.sin(a) * this.ry;
      const x2 = this.cx + Math.cos(a + 0.04) * this.rx;
      const y2 = this.cy + Math.sin(a + 0.04) * this.ry;
      dashG.lineBetween(x1, y1, x2, y2);
    }

    // Checkpoints
    const cpCount = 6;
    for (let i = 0; i < cpCount; i++) {
      const a = (i / cpCount) * Math.PI * 2 - Math.PI / 2;
      const px = this.cx + Math.cos(a) * this.rx;
      const py = this.cy + Math.sin(a) * this.ry;
      this.checkpoints.push(new Phaser.Geom.Rectangle(px - 40, py - 40, 80, 80));

      if (i === 0) {
        trackG.lineStyle(3, 0xfbbf24, 0.5);
        const perpAngle = a + Math.PI / 2;
        trackG.lineBetween(
          px + Math.cos(perpAngle) * 36, py + Math.sin(perpAngle) * 36,
          px - Math.cos(perpAngle) * 36, py - Math.sin(perpAngle) * 36
        );
      }
    }

    this.trailGraphics = this.add.graphics().setDepth(1);

    // Spawn cars
    this.roomPlayers.forEach((p, i) => {
      const startAngle = -Math.PI / 2;
      const offset = (i - (this.roomPlayers.length - 1) / 2) * 20;
      const sx = this.cx + Math.cos(startAngle) * this.rx;
      const sy = this.cy + Math.sin(startAngle) * this.ry + offset;
      const carColor = Phaser.Display.Color.HexStringToColor(p.color).color;

      const bodyRect = this.add.rectangle(0, 0, 22, 12, carColor).setStrokeStyle(1, 0xffffff, 0.3);
      const flameFx = this.add.rectangle(-14, 0, 8, 6, 0xfbbf24).setAlpha(0);
      const container = this.add.container(sx, sy, [flameFx, bodyRect]).setDepth(5);

      this.cars.push({
        sprite: container, bodyRect, flameFx,
        angle: 0, speed: 0, laps: 0, checkpoint: 0,
        nitroActive: false, nitroCooldown: 0, nitroTimer: 0,
        playerId: p.id, playerName: p.name, color: carColor,
        trailPoints: [],
      });
    });

    // HUD
    this.roomPlayers.forEach((p, i) => {
      const txt = this.add.text(16, 16 + i * 20, '', {
        fontSize: '10px', fontFamily: 'JetBrains Mono', color: p.color,
      }).setDepth(20);
      this.hudTexts.push(txt);
    });

    this.add.text(w / 2, h / 2, 'GET READY', {
      fontSize: '24px', fontFamily: 'Syne', color: '#fbbf24', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(30).setName('preRaceText');
  }

  // Check if car is on the track surface
  private isOnTrack(x: number, y: number): boolean {
    const dx = (x - this.cx) / this.rx;
    const dy = (y - this.cy) / this.ry;
    const normalizedDist = Math.sqrt(dx * dx + dy * dy);
    // Should be between inner and outer edge
    const innerRatio = Math.sqrt(
      ((x - this.cx) / this.trackInnerRx) ** 2 + ((y - this.cy) / this.trackInnerRy) ** 2
    );
    const outerRatio = Math.sqrt(
      ((x - this.cx) / this.trackOuterRx) ** 2 + ((y - this.cy) / this.trackOuterRy) ** 2
    );
    return innerRatio >= 1 && outerRatio <= 1;
  }

  update(_time: number, delta: number) {
    if (this.finished) return;

    if (!this.raceStarted) {
      this.preRaceTimer -= delta;
      const txt = this.children.getByName('preRaceText') as Phaser.GameObjects.Text;
      if (this.preRaceTimer <= 0) {
        this.raceStarted = true;
        txt?.destroy();
      } else {
        txt?.setText(this.preRaceTimer > 1000 ? 'GET READY' : 'GO!');
      }
      return;
    }

    const dt = delta / 1000;
    const TURN_SPEED = 4;
    const MAX_SPEED = 300;
    const ACCEL = 10;
    const FRICTION = 0.93;
    const OFF_TRACK_FRICTION = 0.82;
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    this.trailGraphics.clear();

    this.cars.forEach((car, idx) => {
      const inp = this.inputMap[car.playerId] || { x: 0, y: 0, buttonA: false, buttonB: false };

      // Nitro
      if (inp.buttonB && car.nitroCooldown <= 0 && !car.nitroActive) {
        car.nitroActive = true;
        car.nitroTimer = 2000;
        car.nitroCooldown = 5000;
        playNitroBoost();
      }
      if (car.nitroActive) {
        car.nitroTimer -= delta;
        if (car.nitroTimer <= 0) car.nitroActive = false;
      }
      if (car.nitroCooldown > 0) car.nitroCooldown -= delta;

      const maxSpd = MAX_SPEED * (car.nitroActive ? 1.8 : 1);
      const onTrack = this.isOnTrack(car.sprite.x, car.sprite.y);
      const currentFriction = onTrack ? FRICTION : OFF_TRACK_FRICTION;

      // Acceleration
      if (inp.y < -0.2) {
        car.speed = Math.min(car.speed + ACCEL, maxSpd);
      } else if (inp.y > 0.2) {
        car.speed = Math.max(car.speed - ACCEL * 1.5, -MAX_SPEED * 0.4);
      } else {
        car.speed *= currentFriction;
      }

      // Off-track speed penalty
      if (!onTrack) car.speed *= 0.98;

      // Steering
      if (Math.abs(car.speed) > 15) {
        car.angle += inp.x * TURN_SPEED * Math.sign(car.speed);
      }

      // Move
      const rad = Phaser.Math.DegToRad(car.angle - 90);
      car.sprite.x += Math.cos(rad) * car.speed * dt;
      car.sprite.y += Math.sin(rad) * car.speed * dt;
      car.sprite.setAngle(car.angle);

      // Clamp to screen
      car.sprite.x = Phaser.Math.Clamp(car.sprite.x, 15, w - 15);
      car.sprite.y = Phaser.Math.Clamp(car.sprite.y, 15, h - 15);

      // Car-to-car collision
      this.cars.forEach(other => {
        if (other === car) return;
        const dx = other.sprite.x - car.sprite.x;
        const dy = other.sprite.y - car.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20 && dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (20 - dist) / 2;
          car.sprite.x -= nx * overlap;
          car.sprite.y -= ny * overlap;
          other.sprite.x += nx * overlap;
          other.sprite.y += ny * overlap;
          // Speed transfer
          const avgSpeed = (car.speed + other.speed) / 2;
          car.speed = avgSpeed * 0.8;
          other.speed = avgSpeed * 0.8;
        }
      });

      // Nitro visuals
      car.flameFx.setAlpha(car.nitroActive ? 0.8 + Math.sin(_time * 0.02) * 0.2 : 0);
      car.bodyRect.setFillStyle(car.nitroActive ? 0xfbbf24 : car.color);

      // Trail
      if (Math.abs(car.speed) > 30) {
        car.trailPoints.push({ x: car.sprite.x, y: car.sprite.y, age: 0 });
      }
      car.trailPoints = car.trailPoints.filter(tp => {
        tp.age += delta;
        if (tp.age > 400) return false;
        const alpha = 1 - tp.age / 400;
        this.trailGraphics.fillStyle(car.nitroActive ? 0xfbbf24 : car.color, alpha * 0.2);
        this.trailGraphics.fillCircle(tp.x, tp.y, 3);
        return true;
      });

      // Checkpoint
      const nextCp = car.checkpoint % this.checkpoints.length;
      if (this.checkpoints[nextCp].contains(car.sprite.x, car.sprite.y)) {
        car.checkpoint++;
        if (car.checkpoint > 0 && car.checkpoint % this.checkpoints.length === 0) {
          car.laps++;
          playLapComplete();
          if (car.laps >= this.totalLaps) this.finishRace(car);
        }
      }

      // HUD
      if (this.hudTexts[idx]) {
        const nitroBar = car.nitroActive ? ' [NITRO]' : car.nitroCooldown > 0 ? ` [${Math.ceil(car.nitroCooldown / 1000)}s]` : ' [RDY]';
        const trackStatus = onTrack ? '' : ' OFF-TRACK';
        this.hudTexts[idx].setText(`${car.playerName}: Lap ${Math.min(car.laps + 1, this.totalLaps)}/${this.totalLaps}${nitroBar}${trackStatus}`);
      }
    });
  }

  finishRace(winner: CarState) {
    this.finished = true;
    playVictory();
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    this.add.rectangle(w / 2, h / 2, w, h, 0x080810, 0.5).setDepth(50);
    this.add.text(w / 2, h / 2, `${winner.playerName} wins!`, {
      fontSize: '26px', fontFamily: 'Syne', color: '#fbbf24', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    const scores: Record<string, number> = {};
    this.cars.forEach(c => { scores[c.playerName] = c.laps; });
    this.time.delayedCall(3000, () => this.onGameOver(winner.playerName, scores));
  }
}
