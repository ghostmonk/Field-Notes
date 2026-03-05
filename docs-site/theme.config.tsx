import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span style={{ fontWeight: 700 }}>Field Notes Docs</span>,
  project: {
    link: 'https://github.com/ghostmonk/Field-Notes',
  },
  docsRepositoryBase: 'https://github.com/ghostmonk/Field-Notes/tree/main/docs-site',
  footer: {
    content: 'Field Notes Documentation',
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Field Notes Docs" />
      <meta property="og:description" content="Documentation for Field Notes - a modern blog/content management system" />
    </>
  ),
}

export default config
