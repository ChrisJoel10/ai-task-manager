// vitest.config.ts
import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

// Load test environment variables (make sure .env.test exists)
dotenv.config({ path: ".env.local" });

export default defineConfig({
  test: {
    environment: "node", // So Next.js server code works
  },
});
