import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

export default withNextra({
  output: 'export',
  basePath: '/Field-Notes',
  images: {
    unoptimized: true, // Required for static export to GitHub Pages
  },
})
