import type { Fighter } from '../entities/Fighter.js';

export interface BaseController {
  update(): void;
  destroy(): void;
}
