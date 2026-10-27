# Changelog

## 0.2.1

- A company's own address ("Example Technologies Pvt Ltd, Sector 62, Noida") is no longer masked by default; the
  `strict` preset still masks it.
- Placeholders are case-exact: "RAHUL" and "Rahul" get their own placeholders, so `restore()` brings each back as
  written.
- New `skipFakeNumbers` option (default `true`). Set it to `false`, or use the `strict` preset, to also mask
  test-looking numbers such as `9876543210` and `9999999999`.
- README: tests and evaluation sets live in the GitHub repository, not the npm package.

## 0.2.0

- First npm release: India-first PII detection and masking, presets, streaming, fuzzy restore, Express and React
  entry points, CommonJS build, optional OpenRedaction bridge.
