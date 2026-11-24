# Sudoum Sudoku — project handoff

## Product goal

Build a small Sudoku game that runs in a browser and can be deployed as a static GitHub Pages site. It should feel playable without any server or game engine dependency.

## Required player features

- Classic 9×9 Sudoku board.
- Difficulty selection.
- Play guide that explains the basic rules and controls.
- Hints: ideally identify/explain the next logical move, not only reveal a digit.
- Pencil marks / candidate numbers: the player can toggle possible digits inside each empty cell.
- Obvious conflict feedback for duplicate numbers in a row, column, or 3×3 box.
- A new-game flow and a completed-game state.
- Responsive, keyboard-usable controls.

## Puzzle data / engine direction

The recommended implementation is to use a JavaScript/TypeScript Sudoku library rather than ship a huge static puzzle array.

Recommended option: `sudoku-core` by komeilmehranfar.

- MIT licensed.
- Generates uniquely solvable puzzles by difficulty.
- Provides a solved grid, human-style step data, and teaching hints.
- Supports candidate/pencil-mark checking.
- Same difficulty + `seed` produces a reproducible puzzle, so a seed can be saved or shared instead of storing many puzzles.

Alternative lightweight reference implementation: `lucian-devops/sudoku-solver` (MIT), especially its `engine.js`, which includes unique-solution generation and candidate logic.

If using an embedded problem bank instead of generation, the Sudoku Exchange Puzzle Bank is public domain and has several hundred thousand unique-solution puzzles bucketed by difficulty. The app would still need to calculate or retain the solution for hints and completion checks.

## Generation requirements

Do not only generate a valid completed board and randomly erase digits. Removing a clue must be accepted only when the remaining puzzle has exactly one solution. Difficulty should be based on the selected level and, ideally, the solving techniques needed—not only the number of blanks.

## GitHub Pages plan

- Repository name: `sudoum-sudoku` under GitHub user `djadla`.
- Public game URL after Pages is enabled: `https://djadla.github.io/sudoum-sudoku/`.
- For GitHub Free, use a public repository for public Pages hosting.
- Put an `index.html` entry point at the publishing root (or deploy a built static output folder via GitHub Actions).
- In the repository: **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root)**.
- A repository named `djadla.github.io` is *not* required; that special name is only needed for a root-level URL without `/sudoum-sudoku/`.

## Reviewer role (Codex)

Codex is acting as reviewer, not implementation owner. When requesting review, provide the relevant diff, files, or repository state. Review focus:

1. Sudoku correctness: valid placements, unique-solution guarantees, and correct hint behavior.
2. Player experience: clear note mode, selected-cell state, conflict presentation, accessibility, and mobile layout.
3. Deployment: all assets resolve under the `/sudoum-sudoku/` GitHub Pages base path.
4. Code health: simple structure, no unnecessary runtime/server dependency, and license compatibility for copied or installed code.

## Suggested first milestone

Create a functional static page with one generated puzzle, number input, selection highlight, candidate-mark mode, clear/erase action, and completion detection. Then add difficulty, guides, and explanation-based hints.
