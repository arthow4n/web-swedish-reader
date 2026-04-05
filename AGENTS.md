# Guide for coding agents

## How to work in this repo

- This web app is very small and everything fits into the context window. Prefer aggressively read everything and build a full understanding of the repo before you make any plan or edit.
- If you are updating any contents related to the instructions in this `AGENTS.md`, or you updated anything in the `package.json`, build/test config or pipeline actions, make sure you double check all of these and update if needed to make sure the contents in these files are all in sync.
- Prioritize using the available tools you are given access to, instead of writing scripts or running arbitrary commands, even if the action might be slower to do with the tools. This is mainly to ensure your actions such as read/write files will be approved by the user.
- If you are about to run any `npx`/`npm exec` or similar commands, prioritise to `npm run` the scripts already listed in `package.json` instead.
- Prefer object parameters (named arguments) to positional arguments for functions to improve readability.
- Disallow optional arguments with default values. All arguments should be explicitly declared and passed to functions.
- If an element or variable is expected to exist (for example, an element queried from the DOM via `querySelector`), do not suppress missing element errors using optional chaining (`?.`) or type casting (`as HTMLElement`, `as HTMLButtonElement`, etc.). Instead, verify the element's existence and correct type using `instanceof` and throw an explicit error if the check fails (e.g., `if (!(button instanceof HTMLButtonElement)) throw new Error("Button not found");`).
- The project uses Prettier for code formatting. You MUST run `npm run format` before pushing or merging any code changes.
- The project is bundled using Rsbuild. You can start the dev server using `npm run dev` and build the project using `npm run build`.
- Integration tests are located in the `tests/` directory and implemented using Playwright. These tests act as living documents of the expected features. You MUST run them using `npm run test` and ensure they pass before pushing any code changes.
- Tests should be updated as the coding agent go. TDD is recommended.

## Git

- Begin the commit message with the coding agent name.
  - Bad example
    - Add X and do Y
  - Good examples
    - (Antigravity) Add X and do Y
    - (Jules) Add X and do Y
    - (Gemini CLI) Add X and do Y
