# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Faucet client** for requesting testnet tokens programmatically
  - `createFaucetClient(url)` factory function
  - `requestTokens(address, assets?)` to request USD and/or ETH
  - `checkCooldown(addresses)` to check rate limit status
  - `canRequest(address)` convenience method
- `FaucetRequestError` class with `isRateLimited` helper for error handling
- Faucet types: `FaucetDripResponse`, `FaucetStatusResponse`, `FaucetAsset`, etc.
- `faucetUrl` field on `SignetSystemConstants`
- PARMIGIANA now includes `faucetUrl: "https://faucet.parmigiana.signet.sh"`
- `getTokenDecimals(symbol, config?)` helper for chain-aware decimal lookup
- `tokenDecimals` field on `SignetSystemConstants` for testnet overrides
- PARMIGIANA now includes `tokenDecimals: { WUSD: 18 }` override
- `Flow` type export (`"passage"` | `"orders"`)
- `OrderEvent`, `FilledEvent`, `SweepEvent` typed event result interfaces for `parseEventLogs` DX
- RPC Patterns documentation section in README

### Changed

- **Breaking:** `needsWethWrap(symbol, direction, flow)` now requires a `flow` parameter to distinguish between Passage (direct ETH entry) and Orders (Permit2, requires WETH) flows

## [0.3.0] - 2026-02-05

### Added

- Bundle types (`SignetEthBundle`, `SignetCallBundle`) with builder classes
- `SignetEthBundleBuilder` and `SignetCallBundleBuilder` for constructing bundles
- Bundle serialization helpers (`serializeEthBundle`, `serializeCallBundle`)
- Order feasibility checking (`checkOrderFeasibility`)
- Tx-cache client (`createTxCacheClient`) for submitting orders and bundles
- Permit2 approval helpers (`ensurePermit2Approval`)
- Token registry with USDC/USDT addresses for Mainnet and Parmigiana
- Viem chain definitions (`signetRollup`, `parmigianaRollup`, `parmigianaHost`)
- New subpath exports: `/client`, `/permit2`

### Changed

- Expanded token mapping utilities (`getTokenAddress`, `resolveTokenSymbol`, `mapTokenCrossChain`)

### Fixed

- Release workflow now correctly publishes scoped packages to npm with `--access public`

### Note

- v0.2.0 was tagged but never published to npm due to a CI issue

## [0.1.0] - 2026-01-15

### Added

- Initial release of @signet-sh/sdk
- Order and fill signing with EIP-712 and Permit2
- Type definitions matching Rust `signet-types`
- Chain constants for MAINNET and PARMIGIANA
- Test vectors for cross-implementation verification
- Subpath exports for tree-shaking (`/constants`, `/signing`, `/types`, `/abi`, `/tokens`)
