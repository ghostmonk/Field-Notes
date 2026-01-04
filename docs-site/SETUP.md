# Documentation Site Setup

## GitHub Pages Configuration

After merging to main, enable GitHub Pages:

1. Go to repository Settings → Pages
2. Under "Build and deployment":
   - Source: GitHub Actions
3. The workflow will auto-deploy on push to main

## Local Development

```bash
cd docs-site
npm install
npm run dev
```

Visit http://localhost:3000/turbulence

## Building

```bash
npm run build
```

Output is in `out/` directory.

## URL

Once deployed: `https://yourusername.github.io/turbulence`
