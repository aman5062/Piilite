# Changelog

## 0.3.0

- **Sessions for RAG:** `shield.session()` shares one set of placeholders across the question, passages, history and
  the restored answer. `detectAll()` / `redactAll()` scan several texts first.
- **Known values are masked everywhere:** once a value is found, later occurrences are masked even with no clue
  around them, including parts of names ("rahul" after "Rahul Sharma"), mapped to the same placeholder. Turn off
  with `propagate: false`.
- **Placeholders ignore case and spacing again** ("Rahul Sharma" = "rahul sharma", `9123456780` = `+91 91234 56780`);
  restore uses the best-capitalised spelling. `matchCase: true` keeps the 0.2.1 behaviour.
- **Streaming restore:** `createRestoreStream()` / `restoreStream()` hold back a placeholder split across chunks, in
  every form piilite restores.
- `restore()` understands spaces inside type names ("[PHONE IN 1]") and has `fuzzy: "brackets"` to leave bare words
  like `EMAIL_1` alone.
- **Company addresses are masked again by default** (a home address can follow an employer's name);
  `keepCompanyAddresses: true` leaves them. The `strict` preset no longer changes this.
- Benchmark for a RAG answer: about 8 ms to mask 9 KB of question, passages and history.

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
