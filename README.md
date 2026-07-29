# Appointment Platform Reference

[![Public verification](https://github.com/waydefu/appointment-platform-public/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/waydefu/appointment-platform-public/actions/workflows/verify.yml)
[![CodeQL](https://github.com/waydefu/appointment-platform-public/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/waydefu/appointment-platform-public/actions/workflows/codeql.yml)

This repository is a sanitized, code-only reference implementation for an
appointment transaction boundary. Its Git history intentionally begins with one
clean public snapshot.

It contains no clinic website, brand assets, portraits, screenshots, customer
documents, deployment records, live environment identifiers, or real patient
data.

## Included

- Strict appointment command contracts
- Transaction planning and appointment state transitions
- Idempotency and appointment-only audit events
- An application-service repository port with no cloud implementation
- A NestJS API skeleton that exposes only a health endpoint
- Unit tests using opaque identifiers and explicit private-field sentinels

## Deliberately excluded

- User interfaces and visual assets
- Patient identity intake and jurisdiction-specific identifiers
- Scheduling, payroll, case-management, and follow-up policies
- Live calendar, authentication-provider, deployment, and backup integrations
- Internal governance, incident, review, and delivery documents
- Any history or metadata from the private source project

The excluded components are not implied to be safe or production-ready merely
because an interface exists here.

## Local verification

Requirements:

- Node.js 24
- pnpm 11.9.0 through Corepack

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm verify
```

The API binds to loopback by default:

```bash
corepack pnpm --filter @appointment-platform/api dev
```

Only `GET /v1/health` is routed. This repository contains no database, calendar,
identity-provider, deployment, or other cloud adapter.

## Repository safeguards

Normal changes to `main` are made through pull requests and must pass
`Public verification` and `CodeQL`. The default-branch ruleset blocks
force-pushes and deletion on that path; any administrative recovery bypass is
not normal publication approval. GitHub secret scanning and push protection
are enabled.

Workflow actions are pinned to full commit SHAs and receive read-only default
permissions. These controls reduce risk; they do not make this repository
suitable for real personal, patient, staff, credential, or production data.

## Data policy

Do not place personal data, patient information, employee information,
credentials, production logs, private URLs, screenshots, or real identifiers
in this repository. Use `example.invalid`, opaque IDs, and
`PRIVATE_FIELD_SENTINEL_*` values in tests.

Security concerns must be reported through GitHub Private Vulnerability
Reporting as described in [SECURITY.md](SECURITY.md), never through a public
issue containing sensitive material.

## License

No open-source license is granted for this repository. The source is publicly
viewable, but all rights are reserved unless the copyright owner grants
additional permission in writing.
