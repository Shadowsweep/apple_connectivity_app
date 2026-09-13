# MEMEASY Import & Ingestion Pipeline

## 1. Pipeline Stages

The ingestion engine follows a strict 9-stage deterministic pipeline:

```text
1. DISCOVER
   └── Enumerate media objects from connected MediaDevice.

2. EXTRACT METADATA
   └── Extract capture date (EXIF / container / filename), resolution, and size.

3. FILTER
   └── Apply user criteria: Date range, Media types (Photo/Video/Screenshot/Live), Video size bounds.

4. PREVIEW & STORAGE CHECK
   └── Calculate total size, check local disk space, enforce 10 GB safety reserve buffer.

5. QUEUE
   └── Order items chronologically or by size.

6. STAGED COPY
   └── Stream source bytes into `.memeasy/tmp/<import_id>/<staging_file>`.

7. VERIFY
   └── Compute SHA-256 and byte-count of staged file, compare against source.

8. ATOMIC ORGANIZE
   └── Move verified file from `.memeasy/tmp/` to target folder (`Photos/YYYY/MM/IMG_xxxx.ext`).
   └── If collision occurs, compare hashes: if identical -> discard duplicate; if distinct -> rename cleanly.

9. INDEX & LOG
   └── In an atomic SQLite transaction:
       • Register/update `MediaRecord` with metadata, relative path, and SHA-256 hash.
       • Insert `ImportItemRecord` audit trail entry (SUCCESS / FAILED / SKIPPED).
       • Update `ImportRecord` summary counters upon completion.
```

---

## 2. Duplicate Detection Strategy

```text
Incoming Item
     │
     ▼
[ Tier 1: Fast Size Match ]
     │
     ├── Size not found in library -> Mark as NEW (No expensive hash needed yet)
     │
     └── Size matches existing file(s)
              │
              ▼
         [ Tier 2: Hash Comparison ]
              │
              ├── SHA-256 matches existing -> ALREADY_IMPORTED (Skip copying)
              └── SHA-256 differs -> UNIQUE_MEDIA (Proceed to import)
```

---

## 3. Failure & Interruption Scenarios

| Failure Scenario | Action Taken by Pipeline |
| :--- | :--- |
| **USB Disconnection mid-transfer** | Incomplete staged file in `.memeasy/tmp/` is discarded; no partial file written to library; error logged. |
| **Disk Space Exhaustion (<10GB reserve)** | Import pauses gracefully; remaining items marked `SKIPPED_INSUFFICIENT_SPACE`; completed files remain valid. |
| **Corrupted Media Stream** | Checksum verification fails; temp file purged; file marked `VERIFICATION_FAILED`. |
| **App Crash / Power Loss** | On next startup, auto-cleaner purges incomplete `.memeasy/tmp/` directories. |
