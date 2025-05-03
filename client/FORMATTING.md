# Code Formatting Guide

This project uses Prettier and ESLint to ensure consistent code formatting and quality.

## Setup

The project is configured with:

- **Prettier**: For code formatting
- **ESLint**: For code quality checking
- **eslint-config-prettier**: To make ESLint and Prettier work together
- **prettier-plugin-tailwindcss**: For optimal Tailwind CSS class sorting

## Available Commands

- `npm run format`: Format all files with Prettier
- `npm run format:check`: Check if files are properly formatted without making changes
- `npm run lint`: Run ESLint to check for code quality issues
- `npm run lint:fix`: Run ESLint and automatically fix issues where possible
- `npm run fix`: Run both Prettier and ESLint fixers in sequence

## VS Code Integration

The repository includes VS Code settings that will:

1. Format code with Prettier on save
2. Run ESLint fixes on save
3. Use the correct formatter for each file type

Make sure you have the following VS Code extensions installed for the best experience:

- **Prettier - Code formatter** (esbenp.prettier-vscode)
- **ESLint** (dbaeumer.vscode-eslint)

## Configuration Files

- `.prettierrc`: Prettier configuration
- `.prettierignore`: Files to be ignored by Prettier
- `.eslintrc.json`: ESLint configuration
- `.vscode/settings.json`: Editor settings for VS Code

## Style Guide

Our Prettier configuration enforces:

- Single quotes for strings
- 2 spaces for indentation
- Semicolons at the end of statements
- 100 character line length limit
- Trailing commas in multiline objects and arrays
- LF line endings
- No trailing spaces

ESLint configuration enforces best practices for React and TypeScript.

## Pre-commit Hooks (Coming Soon)

In the future, we plan to add pre-commit hooks to ensure all committed code follows our formatting standards.