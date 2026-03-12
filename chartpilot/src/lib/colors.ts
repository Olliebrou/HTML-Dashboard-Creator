export const COLOR_PALETTES: Record<string, string[]> = {
  default: ['#4e81b7', '#e07b54', '#6ab187', '#e8c94a', '#b76e6e', '#7b9ecc', '#c87db9', '#5bbcd9'],
  ocean:   ['#0077b6', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#023e8a'],
  forest:  ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#1b4332'],
  sunset:  ['#ff6b6b', '#ffa07a', '#ffd93d', '#ff8c00', '#ff4500', '#c0392b'],
  mono:    ['#e7edf5', '#a8b9cc', '#7a8da1', '#4d6578', '#2a3f53', '#0f1720'],
};

export const PALETTE_NAMES = Object.keys(COLOR_PALETTES) as (keyof typeof COLOR_PALETTES)[];
