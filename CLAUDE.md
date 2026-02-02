# @signet/sdk TypeScript SDK

## Commands

- `pnpm install` - Install dependencies
- `pnpm build` - Compile TypeScript to dist/
- `pnpm test` - Run tests in watch mode
- `pnpm test:run` - Run tests once
- `pnpm test:anvil` - Run Anvil integration tests (requires local Anvil)
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Run ESLint with auto-fix
- `pnpm format` - Format with Prettier
- `pnpm format:check` - Check formatting without writing
- `pnpm typecheck` - Type check without emitting

## Pre-commit Requirements

- ALWAYS run `pnpm lint` before committing
- ALWAYS run `pnpm format` before committing
- ALWAYS run `pnpm typecheck` before committing

## Code Style

- Use explicit type imports: `import type { Foo } from "./foo.js"`
- Prefer functional style over imperative loops
- Use `viem` types for Ethereum primitives (Address, Hex, etc.)
- Keep functions small and focused
- Write tests that fail fast - use direct assertions, no Result returns
- Avoid unnecessary nesting and closures

## Project Structure

- `src/abi/` - Contract ABIs
- `src/constants/` - Chain configs and addresses
- `src/signing/` - Order/fill signing and EIP-712 logic
- `src/types/` - TypeScript type definitions
- `tests/` - Test files (vectors.test.ts for cross-impl verification)

## Testing

- Unit tests use Vitest
- `vectors.json` contains test vectors from Rust implementation
- Integration tests require Anvil or testnet RPC access
- Tests should throw on failure, not return error types

## Dependencies

- `viem` is the only production dependency (as peerDep)
- Keep dependencies minimal - this is a library

## Releases

This project uses changesets for versioning:

```bash
pnpm changeset        # Create a new changeset
pnpm changeset version  # Apply changesets and bump versions
pnpm changeset publish  # Publish to npm
```
