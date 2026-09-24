import gsap from 'gsap';

/** Paused GSAP timeline on the narration axis: tweens sit at cue times and render only through seek(clock.now()). */
export class Timeline {
  private tl = gsap.timeline({ paused: true });
  private named: Record<string, number> = {};
  to(target: object, vars: gsap.TweenVars, at: number): this { this.tl.to(target, { ease: 'power2.inOut', ...vars }, Math.max(0, at)); return this; }
  set(target: object, vars: gsap.TweenVars, at: number): this { this.tl.set(target, vars, Math.max(0, at)); return this; }
  mark(name: string, at: number): this { this.named[name] = at; return this; }
  end(at: number): this { this.tl.set({}, {}, at); return this; }
  duration(): number { return this.tl.duration(); }
  seek(t: number): void { this.tl.seek(t, false); }
  marks(): Record<string, number> { return this.named; }
}
