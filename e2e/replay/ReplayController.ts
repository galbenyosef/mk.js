export interface ReplayEvent {
  t: number;
  key: string;
  action: 'down' | 'up';
}

export interface InputState {
  LEFT: boolean;
  RIGHT: boolean;
  UP: boolean;
  DOWN: boolean;
  A: boolean;
  B: boolean;
  C: boolean;
  D: boolean;
}

const NONE: InputState = {
  LEFT: false, RIGHT: false, UP: false, DOWN: false,
  A: false, B: false, C: false, D: false,
};

export class ReplayController {
  private _events: ReplayEvent[];
  private _startTime: number = 0;
  private _state: InputState = { ...NONE };
  private _idx: number = 0;

  constructor(events: ReplayEvent[]) {
    this._events = [...events].sort((a, b) => a.t - b.t);
  }

  start(): void {
    this._startTime = Date.now();
    this._state = { ...NONE };
    this._idx = 0;
  }

  getState(): InputState {
    const elapsed = Date.now() - this._startTime;
    while (this._idx < this._events.length && this._events[this._idx].t <= elapsed) {
      const evt = this._events[this._idx];
      const key = evt.key as keyof InputState;
      if (key in this._state) {
        this._state[key] = evt.action === 'down';
      }
      this._idx++;
    }
    return this._state;
  }

  update(): void {}
  destroy(): void {}
}
