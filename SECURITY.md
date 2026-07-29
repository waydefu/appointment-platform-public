# Security policy

## Supported version

Only the current `main` branch is maintained.

## Reporting a vulnerability

Use
[GitHub Private Vulnerability Reporting](https://github.com/waydefu/appointment-platform-public/security/advisories/new)
for this repository. Do not open a public issue or pull request for a suspected
vulnerability.

Reports must not contain real patient data, personal data, credentials,
production logs, private endpoints, or data copied from another system. Use
minimal synthetic reproduction steps and redact identifiers.

This repository is a reference implementation, not a production deployment.
Do not send live traffic or connect it to real records.

Secret scanning, push protection, dependency review, and CodeQL are
defense-in-depth controls. Passing these checks does not certify that the
repository is free of vulnerabilities or sensitive information.
