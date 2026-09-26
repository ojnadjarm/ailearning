import type { SectionSpec } from 'explainer-kit';

/** After the explanation: on to chapter XI, straight to Practice, or the explanation again. */
export const ONWARD = [{ label: 'Your turn', to: 'drive', kind: 'primary' as const }, { label: 'Skip to Practice', to: 'practice', kind: 'secondary' as const }, { label: 'Watch again', to: 'watch', kind: 'quiet' as const }];
/** After the last chapter, and on landing once the lesson is finished: Practice (new exercises or new Tuning puzzles), or the explanation again. */
export const PRACTICE_WAYS = [{ label: 'Practice exercises', to: 'practice', kind: 'primary' as const }, { label: 'Practice tuning', to: 'tunes', kind: 'secondary' as const }, { label: 'Watch again', to: 'watch', kind: 'quiet' as const }];

/** Practice: outside the chapters, open from the bar at any time; a head with one tab per kind and the way back to where the learner left the lesson. */
export const SECTIONS: SectionSpec[] = [{ name: 'Practice', tabs: [{ label: 'Exercises', beat: 'practice' }, { label: 'Tuning', beat: 'tunes' }], back: { label: 'Back to the lesson', to: 'end' },
  note: 'New cases every time; Back to the lesson returns here.' }];
/** The landing card of a finished lesson: the end chooser. */
export const FINISHED = { line: 'You finished this plate.', choices: PRACTICE_WAYS };
/** The next sheet, named on the end card; a phantom until it is drawn (the homepage's unit U02). */
export const NEXT = { label: 'Next: Sheet II · Layers and creases' };
