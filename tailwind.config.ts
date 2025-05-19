// tailwind.config.ts
import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [forms],
  corePlugins: {
    preflight: false, // 避免与antd样式冲突
  },
} satisfies Config
