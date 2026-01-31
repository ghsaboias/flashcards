export interface ReviewState {
  interval: number; // days until next review
  repetition: number; // successful reviews in a row
  efactor: number; // easiness factor (2.5 default)
}

export type Grade = 0 | 1 | 2 | 3 | 4 | 5;
// Wrong:   0 = Blackout, 1 = Recognized, 2 = Almost
// Correct: 3 = Hard, 4 = Medium, 5 = Easy

export const DEFAULT_STATE: ReviewState = {
  interval: 0,
  repetition: 0,
  efactor: 2.5,
};

export function sm2(state: ReviewState, grade: Grade): ReviewState {
  let { interval, repetition, efactor } = state;

  if (grade < 3) {
    // Failed - reset progress
    repetition = 0;
    interval = 1;
  } else {
    // Passed - increase interval
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * efactor);
    }
    repetition++;
  }

  // Update easiness factor (minimum 1.3)
  efactor = Math.max(
    1.3,
    efactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  );

  return { interval, repetition, efactor };
}

export function getDueDate(interval: number): string {
  const date = new Date();
  date.setDate(date.getDate() + interval);
  return date.toISOString().split("T")[0];
}
