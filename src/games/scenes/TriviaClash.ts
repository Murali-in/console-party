import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playCorrectAnswer, playWrongAnswer, playTriviaSelect } from '@/games/SoundFX';

interface TriviaConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean; buttonX: boolean; buttonY: boolean; holdTime: number }>;
}

interface TriviaPlayer {
  color: number;
  name: string;
  score: number;
  answer: number; // -1 = no answer, 0-3 = chosen
  answered: boolean;
}

// General knowledge questions
const QUESTIONS = [
  { q: 'How many sides does a hexagon have?', a: ['4', '5', '6', '8'], correct: 2 },
  { q: 'What planet is closest to the Sun?', a: ['Venus', 'Mercury', 'Mars', 'Earth'], correct: 1 },
  { q: 'What is the speed of light in km/s?', a: ['150,000', '300,000', '450,000', '600,000'], correct: 1 },
  { q: 'Which element has symbol Fe?', a: ['Fluorine', 'Iron', 'Lead', 'Francium'], correct: 1 },
  { q: 'How many bones in the human body?', a: ['186', '206', '226', '256'], correct: 1 },
  { q: 'In binary, what is 1010?', a: ['8', '10', '12', '14'], correct: 1 },
  { q: 'What year did the World Wide Web go public?', a: ['1989', '1991', '1995', '1999'], correct: 1 },
  { q: 'What is the capital of Australia?', a: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], correct: 2 },
  { q: 'Which gas makes up ~78% of Earth\'s air?', a: ['Oxygen', 'Nitrogen', 'CO2', 'Argon'], correct: 1 },
  { q: 'How many bits in a byte?', a: ['4', '6', '8', '16'], correct: 2 },
  { q: 'What is the square root of 144?', a: ['10', '11', '12', '14'], correct: 2 },
  { q: 'Which ocean is the largest?', a: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], correct: 2 },
  { q: 'What is HTTP status 404?', a: ['OK', 'Redirect', 'Not Found', 'Server Error'], correct: 2 },
  { q: 'How many chromosomes do humans have?', a: ['23', '42', '46', '48'], correct: 2 },
  { q: 'What language runs in web browsers?', a: ['Python', 'Java', 'C++', 'JavaScript'], correct: 3 },
  { q: 'What does CPU stand for?', a: ['Central Process Unit', 'Central Processing Unit', 'Core Processing Unit', 'Computer Power Unit'], correct: 1 },
  { q: 'Which company created the iPhone?', a: ['Google', 'Microsoft', 'Apple', 'Samsung'], correct: 2 },
  { q: 'What is the boiling point of water in °C?', a: ['90', '95', '100', '110'], correct: 2 },
  { q: 'How many continents are there?', a: ['5', '6', '7', '8'], correct: 2 },
  { q: 'What does RAM stand for?', a: ['Random Access Memory', 'Read All Memory', 'Run Access Mode', 'Real Active Memory'], correct: 0 },
];

export default class TriviaClashScene extends Phaser.Scene {
  private triviaPlayers: Map<string, TriviaPlayer> = new Map();
  private inputMap: TriviaConfig['inputMap'];
  private onGameOver: TriviaConfig['onGameOver'];
  private roomPlayers: RoomPlayer[];
  private gameEnded = false;
  private questionIndex = 0;
  private usedQuestions: number[] = [];
  private phase: 'question' | 'reveal' | 'done' = 'question';
  private phaseTimer = 0;
  private QUESTION_TIME = 10; // seconds to answer
  private REVEAL_TIME = 3;
  private TOTAL_QUESTIONS = 10;
  private W = 0;
  private H = 0;
  private questionText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private answerTexts: Phaser.GameObjects.Text[] = [];
  private answerBgs: Phaser.GameObjects.Rectangle[] = [];
  private scoreTexts: Phaser.GameObjects.Text[] = [];
  private resultText!: Phaser.GameObjects.Text;
  private questionNumText!: Phaser.GameObjects.Text;
  private prevInputState: Map<string, { x: number; y: number }> = new Map();

  constructor(config: TriviaConfig) {
    super({ key: 'TriviaClash' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    this.W = Number(this.game.config.width);
    this.H = Number(this.game.config.height);

    // Shuffle questions
    this.usedQuestions = Array.from({ length: QUESTIONS.length }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, this.TOTAL_QUESTIONS);

    this.roomPlayers.forEach(p => {
      this.triviaPlayers.set(p.id, {
        color: parseInt(p.color.replace('#', ''), 16),
        name: p.name, score: 0, answer: -1, answered: false,
      });
    });

    // Question number
    this.questionNumText = this.add.text(this.W / 2, 20, '', {
      fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#888888',
    }).setOrigin(0.5);

    // Question text
    this.questionText = this.add.text(this.W / 2, this.H * 0.18, '', {
      fontFamily: 'Syne', fontSize: '18px', color: '#ffffff',
      wordWrap: { width: this.W - 80 }, align: 'center',
    }).setOrigin(0.5);

    // Timer
    this.timerText = this.add.text(this.W / 2, this.H * 0.3, '', {
      fontFamily: 'JetBrains Mono', fontSize: '28px', color: '#ffffff',
    }).setOrigin(0.5);

    // Answer options (2x2 grid)
    const labels = ['↑ A', '→ B', '↓ C', '← D'];
    const positions = [
      { x: this.W * 0.25, y: this.H * 0.45 },
      { x: this.W * 0.75, y: this.H * 0.45 },
      { x: this.W * 0.25, y: this.H * 0.6 },
      { x: this.W * 0.75, y: this.H * 0.6 },
    ];

    for (let i = 0; i < 4; i++) {
      const bg = this.add.rectangle(positions[i].x, positions[i].y, this.W * 0.42, 44, 0x222222)
        .setStrokeStyle(1, 0x444444);
      const txt = this.add.text(positions[i].x, positions[i].y, '', {
        fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#ffffff',
        wordWrap: { width: this.W * 0.38 }, align: 'center',
      }).setOrigin(0.5);
      this.answerBgs.push(bg);
      this.answerTexts.push(txt);
    }

    // Result text
    this.resultText = this.add.text(this.W / 2, this.H * 0.75, '', {
      fontFamily: 'Syne', fontSize: '16px', color: '#34d399',
    }).setOrigin(0.5);

    // Score display
    let sx = 20;
    this.triviaPlayers.forEach(tp => {
      const st = this.add.text(sx, this.H - 30, `${tp.name}: 0`, {
        fontFamily: 'JetBrains Mono', fontSize: '11px',
        color: `#${tp.color.toString(16).padStart(6, '0')}`,
      });
      this.scoreTexts.push(st);
      sx += 160;
    });

    this.showQuestion();
  }

  private showQuestion() {
    if (this.questionIndex >= this.TOTAL_QUESTIONS) {
      this.endGame();
      return;
    }

    const qi = this.usedQuestions[this.questionIndex];
    const q = QUESTIONS[qi];

    this.questionNumText.setText(`Question ${this.questionIndex + 1}/${this.TOTAL_QUESTIONS}`);
    this.questionText.setText(q.q);
    this.resultText.setText('');

    const dirLabels = ['↑', '→', '↓', '←'];
    for (let i = 0; i < 4; i++) {
      this.answerTexts[i].setText(`${dirLabels[i]}  ${q.a[i]}`);
      this.answerBgs[i].setFillStyle(0x222222);
      this.answerBgs[i].setStrokeStyle(1, 0x444444);
    }

    this.triviaPlayers.forEach(tp => {
      tp.answer = -1;
      tp.answered = false;
    });
    this.prevInputState.clear();

    this.phase = 'question';
    this.phaseTimer = this.QUESTION_TIME;
  }

  update(_time: number, delta: number) {
    if (this.gameEnded) return;
    const dt = delta / 1000;
    this.phaseTimer -= dt;

    if (this.phase === 'question') {
      this.timerText.setText(Math.ceil(Math.max(0, this.phaseTimer)).toString());

      // Read inputs: joystick direction = answer choice
      // Up=0, Right=1, Down=2, Left=3
      this.triviaPlayers.forEach((tp, pid) => {
        if (tp.answered) return;
        const inp = this.inputMap[pid] ?? { x: 0, y: 0, buttonA: false, buttonB: false };

        // CPU AI: answer randomly after a delay
        if (pid.startsWith('demo-cpu') || pid.startsWith('cpu-')) {
          if (this.phaseTimer < this.QUESTION_TIME - 2 - Math.random() * 3) {
            const qi = this.usedQuestions[this.questionIndex];
            const q = QUESTIONS[qi];
            // 60% chance correct
            tp.answer = Math.random() < 0.6 ? q.correct : Math.floor(Math.random() * 4);
            tp.answered = true;
          }
          return;
        }

        const threshold = 0.6;
        let choice = -1;
        if (inp.y < -threshold && Math.abs(inp.x) < threshold) choice = 0; // Up
        else if (inp.x > threshold && Math.abs(inp.y) < threshold) choice = 1; // Right
        else if (inp.y > threshold && Math.abs(inp.x) < threshold) choice = 2; // Down
        else if (inp.x < -threshold && Math.abs(inp.y) < threshold) choice = 3; // Left

        // Only register on "new" direction (debounce)
        const prev = this.prevInputState.get(pid) ?? { x: 0, y: 0 };
        const wasIdle = Math.abs(prev.x) < threshold && Math.abs(prev.y) < threshold;
        this.prevInputState.set(pid, { x: inp.x, y: inp.y });

        if (choice >= 0 && wasIdle) {
          tp.answer = choice;
          tp.answered = true;
          playTriviaSelect();
        }
      });

      // All answered or time up
      const allAnswered = Array.from(this.triviaPlayers.values()).every(tp => tp.answered);
      if (allAnswered || this.phaseTimer <= 0) {
        this.revealAnswer();
      }
    } else if (this.phase === 'reveal') {
      this.timerText.setText('');
      if (this.phaseTimer <= 0) {
        this.questionIndex++;
        this.showQuestion();
      }
    }
  }

  private revealAnswer() {
    this.phase = 'reveal';
    this.phaseTimer = this.REVEAL_TIME;

    const qi = this.usedQuestions[this.questionIndex];
    const q = QUESTIONS[qi];

    // Highlight correct answer
    for (let i = 0; i < 4; i++) {
      if (i === q.correct) {
        this.answerBgs[i].setFillStyle(0x22c55e, 0.3);
        this.answerBgs[i].setStrokeStyle(2, 0x22c55e);
      } else {
        this.answerBgs[i].setFillStyle(0x222222, 0.5);
      }
    }

    // Score correct answers
    const correctNames: string[] = [];
    this.triviaPlayers.forEach(tp => {
      if (tp.answer === q.correct) {
        tp.score += 100 + Math.floor(Math.max(0, this.phaseTimer) * 10);
        correctNames.push(tp.name);
      }
    });

    if (correctNames.length > 0) {
      playCorrectAnswer();
      this.resultText.setText(`✓ ${correctNames.join(', ')} got it!`);
    } else {
      playWrongAnswer();
      this.resultText.setText('✗ Nobody got it right');
    }

    // Update scores
    let i = 0;
    this.triviaPlayers.forEach(tp => {
      if (this.scoreTexts[i]) {
        this.scoreTexts[i].setText(`${tp.name}: ${tp.score}`);
      }
      i++;
    });
  }

  private endGame() {
    this.gameEnded = true;
    const scores: Record<string, number> = {};
    let winner = '';
    let best = -1;
    this.triviaPlayers.forEach(tp => {
      scores[tp.name] = tp.score;
      if (tp.score > best) { best = tp.score; winner = tp.name; }
    });
    this.onGameOver(winner, scores);
  }
}
