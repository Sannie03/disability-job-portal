import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
        "23b620f57c0d.ngrok-free.app"
    ]
  }
})
