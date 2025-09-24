# HSK Flashcards Application — User Flow Map

## Entry Points & Navigation
- **Home (`/`)**
  - `QuickStartSection` – toggle between `random` and `semantic` learning, then launch an auto session.
  - "Explore Character Network" button – navigates to `/network`.
  - "Show Advanced Options" – exposes the traditional practice panel without leaving the page.
- **Practice (`/practice`)**
  - Renders `PracticeModesSection` for users who bookmark the page.
- **Network (`/network`)**
  - Full graph explorer for browsing semantic/radical/compound links.
- **Stats (`/stats`)**
  - Aggregated performance dashboards (unchanged during recent semantic work).

## Session Creation Flows
1. **Quick Start (default)**
   - Determine learning mode (`random` vs `semantic`).
   - For semantic mode, `useConnectionAwareSession` selects a cluster and enriches the auto-start payload with `connection_aware` metadata.
   - Auto-start response includes `connection_session` details; the session enters high-intensity layout.
2. **Traditional Modes**
   - Users select difficulty filters, multi-set practice, SRS review, browse, or drawing.
   - Routes through the same `beginAutoSession` pipeline with the chosen parameters.

## In-Session Experience
- High-intensity UI with optional pinyin toggle, audio playback, and streak tracking.
- When `connection_session` metadata exists, `MiniNetworkViewer` shows a compact graph for the current character.
- Answers post back to the Durable Object, updating streaks and accuracy metrics.

## Completion
- Displays accuracy, streak, and incorrect answers.
- Offers quick reinforcement (review incorrect), restart, or navigation back to practice options.

## Knowledge Graph Touchpoints
- Semantic mode is opt-in per session and falls back to random ordering if the API or dataset is unavailable.
- `/network` gives an overview of the full dataset; it does not yet gate session flow or track mastery visuals.
- Future enhancements (cluster selection UI, phase progress indicators) remain on the roadmap and are not part of the live flow.
