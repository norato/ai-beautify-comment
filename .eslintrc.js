module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script'
  },
  globals: {
    chrome: 'readonly',
    importScripts: 'readonly'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'no-undef': 'error',
    'semi': ['error', 'always'],
    'quotes': ['warn', 'single', { allowTemplateLiterals: true }],
    'no-case-declarations': 'warn'
  },
  overrides: [
    {
      files: ['scripts/**/*.js', '.eslintrc.js', 'utils.js'],
      env: {
        node: true,
        browser: false
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly'
      }
    }
  ]
};