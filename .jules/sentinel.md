## 2024-05-24 - Add sourceLanguage Parameter Injection Protection
**Vulnerability:** The application extracted the `sourceLanguage` query parameter directly from the URL and interpolated it into a fetch request unencoded.
**Learning:** Even internal parameters that aren't inherently "secrets" can be vectors for HTTP parameter injection attacks when passed directly to backend APIs if they allow unexpected characters like `&` and `=`.
**Prevention:** Always validate URL parameters against an expected pattern (e.g. BCP 47 language codes `/^[a-zA-Z0-9-]+$/`) before using them in API calls.
