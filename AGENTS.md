# Guide for coding agents

## How to work in this repo

- This web app is very small and everything fits into the context window. Prefer aggressively read everything and build a full understanding of the repo before you make any plan or edit.
- Prioritize using the available tools you are given access to, instead of writing scripts or running arbitrary commands, even if the action might be slower to do with the tools. This is mainly to ensure your actions such as read/write files will be approved by the user.
- Integration tests are located in the `tests/` directory and implemented using Playwright. These tests act as living documents of the expected features. You MUST run them using `npm run test` and ensure they pass before pushing any code changes.
