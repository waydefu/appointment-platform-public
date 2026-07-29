# Contributing

All changes must keep this repository safe for public indexing and cloning.

Before opening a pull request:

1. Use only opaque test identifiers, `example.invalid`, and
   `PRIVATE_FIELD_SENTINEL_*` values.
2. Do not add personal data, patient data, staff data, credentials, private
   endpoints, absolute local paths, screenshots, documents, or binary assets.
3. Do not add deployment or live-provider integrations without an explicit
   security review.
4. Use a GitHub noreply commit address.
5. Run `corepack pnpm verify`.
6. Pin every GitHub Action to a full commit SHA and grant only the permissions
   it requires.

All changes target `main` through a pull request. `Public verification` and
`CodeQL` must pass. Do not weaken, bypass, or rename required checks without
repository-owner review.

Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).
