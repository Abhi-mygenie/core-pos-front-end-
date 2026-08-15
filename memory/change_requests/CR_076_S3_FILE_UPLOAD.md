# CR-076 — Amazon S3 File Upload (Invoices + Room Check-in Docs)

**ID:** CR-076
**Date:** 2026-07-18
**Source:** OWNER-DIRECTED
**Type:** CR
**Severity:** P2
**Risk:** MEDIUM
**Sprint:** POS 5.0
**Related:** CR-075 (Inventory UX — P3 invoice attachment), CR-072 (Inventory)

---

## Summary

Integrate Amazon S3 for file uploads across two modules:
- **(A) Purchase/Receive:** Invoice PDF/image attachment on purchase entries
- **(B) Room Check-in:** Document uploads during room check-in process

Shared S3 service layer, per-module upload UI.

---

## Scope

| Module | Upload Type | Current State |
|--------|-----------|--------------|
| Purchase Entry | Invoice PDF/Image | Browse button exists (placeholder, no handler) |
| Room Check-in | Guest documents (ID, booking) | TBD — need to investigate current check-in form |

### Shared Infrastructure:
- S3 client configuration (bucket, region, credentials)
- Upload service (`s3UploadService.js`)
- File picker component (accept PDF/JPG/PNG, size limit)
- Progress indicator + error handling

---

## Open Questions

| # | Question | Status |
|---|----------|--------|
| OQ-1 | S3 bucket name + region + credentials (or backend proxy endpoint?) | PENDING — owner |
| OQ-2 | Max file size limit? | PENDING — owner |
| OQ-3 | Should upload go direct to S3 (presigned URL) or via backend proxy? | PENDING — owner |
| OQ-4 | Room check-in: what documents are uploaded? Multiple files per check-in? | PENDING — investigation |

---

## Next
Planning Gate 2 after S3 credentials/approach confirmed.
