import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import path from 'path'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  base: "/",
  resolve: {
    alias: {
      '#': path.resolve(import.meta.dirname, './src'),
    },
    extensions: ['.mts', '.js', '.ts', '.jsx', '.tsx', '.json'],
    tsconfigPaths: true,
  },
  plugins: [devtools(), tailwindcss(), tanstackStart({
    prerender: {
      enabled: true,
    }
  }), viteReact()],
})

export default config
