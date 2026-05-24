import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import type { ReplayEvent } from '../replay/ReplayController.js';

export async function injectReplay(page: Page, fixtureName: string): Promise<void> {
  const fixturePath = path.resolve(__dirname, '..', 'replay-fixtures', fixtureName);
  const raw = fs.readFileSync(fixturePath, 'utf-8');
  const events: ReplayEvent[] = JSON.parse(raw);

  await page.evaluate((eventsJson) => {
    const events = JSON.parse(eventsJson);
    class ReplayController {
      private _events: any[];
      private _startTime: number = 0;
      private _state: any = { LEFT: false, RIGHT: false, UP: false, DOWN: false, A: false, B: false, C: false, D: false };
      private _idx: number = 0;
      constructor(evts: any[]) {
        this._events = [...evts].sort((a, b) => a.t - b.t);
      }
      start() { this._startTime = Date.now(); this._state = { LEFT: false, RIGHT: false, UP: false, DOWN: false, A: false, B: false, C: false, D: false }; this._idx = 0; }
      getState() {
        const elapsed = Date.now() - this._startTime;
        while (this._idx < this._events.length && this._events[this._idx].t <= elapsed) {
          const evt = this._events[this._idx];
          if (evt.key in this._state) this._state[evt.key] = evt.action === 'down';
          this._idx++;
        }
        return this._state;
      }
      update() {}
      destroy() {}
    }

    const controller = new ReplayController(events);
    controller.start();
    (window as any).__MK_REPLAY = controller;
  }, JSON.stringify(events));
}

export function loadReplayFixture(fixtureName: string): ReplayEvent[] {
  const fixturePath = path.resolve(__dirname, '..', 'replay-fixtures', fixtureName);
  const raw = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(raw);
}
