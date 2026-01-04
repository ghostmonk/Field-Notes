import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 700 }}>Turbulence Docs</span>,
  project: {
    link: 'https://github.com/yourusername/turbulence',
  },
  docsRepositoryBase: 'https://github.com/yourusername/turbulence/tree/main/docs-site',
  footer: {
    content: 'Turbulence Documentation',
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Turbulence Docs',
    }
  },
}

export default config
