# CurryClub

A curry house rating application built with React, Vite, and Express.

## Quick Start

- **Development Setup**: See instructions below
- **Production Deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step EC2 Ubuntu deployment instructions
- **Nginx Setup**: See [NGINX_CONFIGURATION.md](NGINX_CONFIGURATION.md) for configuring Nginx reverse proxy and troubleshooting cache issues
- **Server Cleanup**: If you need to clean up outdated files on your production server:
  - **Quick Commands**: See [QUICK_START.md](QUICK_START.md) for fastest cleanup
  - **Detailed Guide**: See [SERVER_CLEANUP.md](SERVER_CLEANUP.md) for step-by-step instructions

## Development

### Running the Development Server

```bash
npm install
npm run dev
```

This will start the Vite development server on `http://localhost:5173`.

### Running the Production Server

```bash
npm install
npm run build
npm run server
```

This will:
1. Build the application to the `dist` folder
2. Start the Express server on `http://localhost:3001`

## Important Notes

### Page Title Configuration

The page title is set in `index.html`:

```html
<title>LDL$$ Does Curry</title>
```

**Important**: When you change the title in `index.html`, you must run `npm run build` for the changes to take effect in production. This is because:

- **Development mode** (`npm run dev`): Uses the source `index.html` directly
- **Production mode** (`npm run server`): Serves the built `dist/index.html` file

The build process copies `index.html` to `dist/index.html` and injects the necessary script tags for the bundled JavaScript and CSS.