# Focus Timer

[![Test](https://github.com/yousseifindx5/focus-timer/actions/workflows/test.yml/badge.svg)](https://github.com/yousseifindx5/focus-timer/actions/workflows/test.yml)
[![Release](https://img.shields.io/github/v/release/yousseifindx5/focus-timer)](https://github.com/yousseifindx5/focus-timer/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A desktop Pomodoro timer for work and study, with tasks, streaks, analytics, ambient sounds and themes.
Built with Electron, React and TypeScript. Interface in Arabic and English.

## Download

Get the latest Windows build from the [Releases page](https://github.com/yousseifindx5/focus-timer/releases/latest):

- `Focus-Timer-Setup-x.x.x.exe` - installer
- `Focus-Timer-Portable-x.x.x.exe` - runs without installing

Windows may show a SmartScreen warning because the app is not code-signed. Choose "More info", then "Run anyway".

## Features

**Timer**
- Multiple systems: 25/5, 45/15, 50/10, 90/20 and fully custom presets (auto-saved by default)
- Auto switch between focus and break, long break after a set number of sessions
- Start, pause, resume, reset and skip; in-app shortcuts: Space (start/pause) and R (reset)
- Smart notifications: sound, in-app visual alerts and system notifications

**Tasks and projects**
- Daily, weekly and monthly tasks plus projects, each marked as work or study
- Difficulty (easy, medium, hard) with an estimated number of pomodoros, and priorities
- Drag and drop ordering, deadlines with overdue alerts
- Task analytics: estimated time vs actual time and completed pomodoros

**Progress**
- Daily and weekly streaks, longest streak, streak freeze (2 per month)
- XP and levels that grow with every pomodoro, 33 badges
- Summaries: daily (hourly chart), weekly (day comparison, trend, goals), monthly (activity heatmap, streak evolution) and a custom range of up to 3 months
- All summaries can be split into work and study

**Sounds**
- Synthesized ambient sounds (rain, ocean, wind, fireplace, birds, noise colors, calm pad), mixable
- Sound effects, switchable independently from ambient sounds

**Customization**
- 13 built-in themes, a custom theme builder and a random theme generator
- Fonts, timer size, sidebar left or right, timer centered or on the side, custom background image
- Compact window mode that can stay on top of other programs

**Smart helpers**
- Best focus time based on your history
- Break suggestions (stretching, breathing, movement) and water reminders
- Motivational quotes and your own goal reminders, each with its own display time

## Build from source

Requirements: [Node.js](https://nodejs.org) 18 or newer (LTS recommended).

```bash
npm install
npm run dev          # run with live reload
npm run typecheck    # type check
npm test             # unit tests
npm run dist:win     # build the Windows exe files into release/
```

On Windows you can also double-click `Build.bat`. It builds everything and puts the final files in the `Output` folder.
If you see "Cannot create symbolic link", run it as Administrator or enable Windows Developer Mode.

## Releases with GitHub Actions

| Workflow | Runs on | What it does |
|---|---|---|
| `test.yml` | every push and pull request | type check, unit tests, web build |
| `release.yml` | tags starting with `v` | builds the exe files and publishes a GitHub release |

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Project structure

```
electron/       app window (main and preload)
src/store.ts    app state, timer, tasks, notifications
src/game.ts     streaks, XP, levels, badges
src/stats.ts    summary calculations
src/audio.ts    synthesized sounds (no audio files)
src/themes.ts   themes and the random theme generator
src/pages/      Timer, Tasks, Summaries, Streak, Sounds, Settings
src/__tests__/  unit tests
build/          app icon
```

## Roadmap

- Notion integration
- Donate button
- Linux and macOS builds

## License

[MIT](LICENSE)
