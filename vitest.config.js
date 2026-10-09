const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    clearMocks: true,
    include: ['tests/**/*.test.js']
  }
});
