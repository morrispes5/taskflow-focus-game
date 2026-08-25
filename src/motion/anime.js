import { animate } from 'animejs';

export function playRewardSequence(node, reduced = false) {
  if (!node || reduced) return;
  animate(node, {
    translateY: [8, 0],
    opacity: [0, 1],
    duration: 520,
    ease: 'out(4)'
  });
}

export function playNumberSequence(node, reduced = false) {
  if (!node || reduced) return;
  animate(node, {
    scale: [0.92, 1],
    duration: 420,
    ease: 'out(4)'
  });
}

export function playHeroSequence(node, reduced = false) {
  if (!node || reduced) return;
  const targets = node.querySelectorAll('[data-hero-item]');
  if (!targets.length) return;
  return animate(targets, {
    translateY: [12, 0],
    opacity: [0, 1],
    delay: (_, index) => index * 80,
    duration: 520,
    ease: 'out(4)'
  });
}
