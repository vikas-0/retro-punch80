# PUNCH/80

An interactive retro-futuristic 80-column punch-card simulator that converts source code into virtual card decks and runs Fortran locally with LFortran WebAssembly.

## Features

- Convert ordinary multi-line source code into an 80-column virtual card deck
- Animate card loading, punching, scanning, reading, and ejection
- Edit individual punch holes manually
- Replay a deck to reconstruct the original source
- Compile and run Fortran entirely inside the browser
- Display compiler diagnostics, stdout, compile time, execution time, and generated WASM size
- Synthesized mechanical sound effects, speed controls, and reduced-motion support
- Export a card deck as JSON
- Responsive desktop and tablet layouts

## Run locally

```bash
npm install
npm run dev
```

Then open [http://127.0.0.1:5173](http://127.0.0.1:5173).

Create a production build with:

```bash
npm run build
```

## How it works

Each source line becomes one 80-column card. Letters and digits use classic Hollerith-style patterns. Other printable characters use a reversible extension so mixed-case source code and punctuation survive a complete punch/read round trip.

Fortran source is compiled in the browser by the bundled LFortran compiler. The compiler emits a second WebAssembly program, which PUNCH/80 executes through a small WASI bridge while capturing standard output.

The compiler is loaded only when `RUN FORTRAN` is selected. No source code is sent to a server.

## Current limitations

- Source lines are limited to 80 characters.
- Decks are limited to 50 cards.
- Interactive Fortran stdin (`read`) is not implemented yet.
- LFortran is still under active development, so some advanced or legacy Fortran programs may not compile.
- The first compiler run loads a roughly 22 MB WebAssembly asset.

## LFortran

The bundled browser runtime is LFortran 0.52.0, commit `b5e05bd3a`, matching the build used by the official LFortran browser frontend when this project was created. Runtime provenance is recorded in `public/lfortran/runtime.json`.

LFortran is distributed under a BSD license. Its license is included at `public/lfortran/LICENSE`.
