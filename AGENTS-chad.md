# AGENTS-chad.md - Custom Guidelines and Preferences for Actual Budget

This file contains additional custom guidelines, preferences, and helper information beyond the standard AGENTS.md guide.

## Plan Organization

All implementation plans created during development should be stored in the `.plans/` directory at the project root for future reference. This helps maintain a historical record of architectural decisions and implementation strategies.

**Guidelines:**

- Store plans with descriptive filenames: `plans/feature-name-YYYY-MM-DD.md` or `plans/task-name.md`
- Include context, approach, and any relevant architectural decisions
- Link to related issues or PRs when applicable
- Plans serve as documentation for why certain implementation choices were made
- When you create a plan, save it under `.plans/` with a clear name, include a TODO list, and keep that TODO list updated as implementation proceeds

## Additional Test Commands (Watch Mode)

Beyond the standard test commands in AGENTS.md, you can also run tests in watch mode for faster development iteration:

```bash
# Run a specific test file (watch mode)
yarn workspace loot-core run test path/to/test.test.ts

# Unit test for a specific file in loot-core (watch mode)
yarn workspace loot-core run test src/path/to/file.test.ts
```

## Additional Helper Scripts

Beyond the essential commands documented in the Quick Start section, the following helper scripts are available:

- `start:docs` - Start the documentation server
- `start:service-plugins` - Start the plugins service watcher
- `build:plugins-service` - Build the plugins service
- `build:docs` - Build documentation
- `generate:release-notes` - Generate release notes
- `start:server` - Direct server start without dev environment
- `rebuild-electron`, `rebuild-node` - Rebuild native modules

For a complete list of available scripts, run `yarn run` or check the `scripts` section in [package.json](./package.json).

## Node.js Version Note

This configuration references Node.js >=22. Check the current requirements in AGENTS.md as they may have been updated in newer upstream versions. The standard requirement might be >=20 or higher depending on when you're reading this.

## Further Reading

For deeper understanding of Actual's systems, see:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Deep dive into CRDT sync, AQL queries, client-server communication, and platform abstraction
- **[DATA-FLOW.md](./DATA-FLOW.md)**: Redux patterns, undo/redo system, reactivity, and query dependencies
- **[DOMAIN-LOGIC.md](./DOMAIN-LOGIC.md)**: Transactions, split transactions, envelope budgeting, and budget calculations

These documents provide detailed explanations of core systems that are essential when working on sync, queries, state management, or budget logic.

---

**Note**: This file documents custom preferences and additional information beyond the standard AGENTS.md. Always refer to AGENTS.md for the primary development guidelines.
