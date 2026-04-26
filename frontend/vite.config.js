import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  server: {
    https: true, // Enable HTTPS
    // Remove or comment out the 'key' and 'cert' paths
    // https: {
    //   key: fs.readFileSync('./localhost-key.pem'),
    //   cert: fs.readFileSync('./localhost.pem'),
    // }
  }
})
