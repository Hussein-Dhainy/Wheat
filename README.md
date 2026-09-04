# Wheat WebGL Experience

An interactive, scroll-driven wheat story built with React, Three.js, React Three Fiber, and Vite.

## Requirements

- Node.js 20.19 or newer
- npm
- A modern browser with WebGL enabled; Chrome or Edge is recommended for development

No environment variables or backend services are required.

## Run the website locally

Open a terminal in the project folder and install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will print a local address, normally:

```text
http://localhost:5173/
```

Open that address in your browser. If port `5173` is already occupied, use the alternative address printed in the terminal.

Scroll, swipe, or use the keyboard to move through the scenes. The chapter navigation on the right can be used to jump between parts of the experience.

Stop the server with `Ctrl+C` in the terminal.

## Create and preview a production build

Build the optimized static website:

```bash
npm run build
```

The generated website is written to `dist/`. Preview that build locally with:

```bash
npm run preview
```

Open the address printed by Vite, normally `http://localhost:4173/`.

## Tests

Run the automated test suite:

```bash
npm test
```

To run the browser and WebGL smoke test, first keep the development server running in one terminal. In a second terminal, run:

```bash
npm run smoke
```

The smoke test requires Google Chrome and checks for browser exceptions, console errors, failed requests, and WebGL loading failures.

## Common problems

- **The page does not open:** Confirm `npm run dev` is still running and use the exact address shown in its terminal.
- **A blank scene appears:** Enable hardware acceleration and WebGL in the browser, then reload the page.
- **Models fail to load:** Run `npm install` again, restart the development server, and check the browser console for failed local asset requests.
- **Port 5173 is busy:** Use the next port selected by Vite, or stop the process already using that port.

## Project notes

- Deployable models and textures live under `public/`.
- Product, architecture, asset, and acceptance documentation lives under `planning/`.
