# @signet-sh/sdk TypeScript SDK

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

## Changelog

- ALWAYS update `CHANGELOG.md` when adding features, fixing bugs, or making breaking changes
- Follow [Keep a Changelog](https://keepachangelog.com/) format
- Add entries under `[Unreleased]` section during development
- Categories: Added, Changed, Deprecated, Removed, Fixed, Security

## Releases

Releases are automated via GitHub Actions. To release:

1. Update version in `package.json`
2. Move `[Unreleased]` entries to a new version section in `CHANGELOG.md`
3. Commit and push to `main`
4. CI creates GitHub release and publishes to npm

## SDK Scope

The SDK focuses on:

- Types and type definitions
- Contract ABIs
- EIP-712 signing logic
- Chain constants and addresses
- Complex operations that add real value (validation, aggregation, edge case handling)

The SDK should NOT include:

- Thin wrappers around viem's `readContract`/`writeContract`
- Simple parameter rearrangement helpers
- Functions that just inject a constant into a viem call

Instead, export the ABIs and constants, then document direct viem usage patterns in README.
