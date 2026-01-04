import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 700 }}>Turbulence Docs</span>,
  project: {
    link: 'https://github.com/ghostmonk/Field-Notes',
  },
  docsRepositoryBase: 'https://github.com/ghostmonk/Field-Notes/tree/main/docs-site',
  footer: {
    content: 'Turbulence Documentation',
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Turbulence Docs" />
      <meta property="og:description" content="Documentation for Turbulence - a modern blog/content management system" />
    </>
  ),
}

export default config
