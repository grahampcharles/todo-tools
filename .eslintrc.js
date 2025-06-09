export default {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parserOptions: {
        sourceType: 'module', // THIS IS IMPORTANT
        ecmaVersion: 'latest',
    },
    rules: {
        '@typescript-eslint/no-require-imports': 'off',
        'no-undef': 'off'
    }
};
  