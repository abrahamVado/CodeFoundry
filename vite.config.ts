import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  test: {
    //1.- Configure Vitest to emulate a browser-like environment for component tests.
    environment: "jsdom",
    globals: true
  }
});
