# Mock credential policy

The records in `mock/user.json` are deterministic test fixtures only.

- The plaintext password is synthetic and must never be accepted as a production credential.
- Production authentication must be delegated to a backend identity provider.
- Production runtime code must not import this file as an authentication source.
- The guest record intentionally has no phone number or credentials.
- Fixture metadata marks production use as prohibited.

This repository governs the application blueprint and test fixtures. It does not implement a production authentication provider or runtime application.
