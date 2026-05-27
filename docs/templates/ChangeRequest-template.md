# Change Request CR-NNN
**Project:** [Name]
**Date raised:** YYYY-MM-DD
**Raised by:** [agent name / User]
**Status:** Open | Approved | Rejected | Deferred | Implemented
**Decision authority:** [User]

---

## 1. Change Summary
[One sentence: what changes?]

## 2. Reason for Change
[Why now? What triggered this?]

## 3. Phase Impact
**Current phase:** [e.g., Build]
**Phases affected by this change:** [list]

## 4. Detailed Impact Analysis

### 4.1 SRS Impact
- Sections affected: [e.g., 3.2.1, 4.4]
- Requirements added: [REQ-XXX]
- Requirements changed: [REQ-XXX before / after]
- Requirements removed: [REQ-XXX]

### 4.2 Design Impact (HLD / LLD)
- [What design docs need updating]

### 4.3 RTM Impact
- New requirement rows: [REQ IDs]
- Changed rows: [REQ IDs and what changes]
- New test cases needed: [estimate count]

### 4.4 Code Impact
- Estimated modules to change: [list]
- Estimated effort: [hours / days]

### 4.5 Test Impact
- New test cases: [count]
- Affected test cases (need re-execution): [count]
- Regression scope: [partial / full]

### 4.6 Schedule Impact
- Current target [phase end] date: YYYY-MM-DD
- Revised target: YYYY-MM-DD
- Net change: +/- X days

### 4.7 Cost Impact
- Infra / services cost change: [if any]
- Team effort: [story points or person-days]

### 4.8 Risk Impact
- New risks introduced: [...]
- Risks mitigated by this change: [...]

---

## 5. Options Considered

### 5.1 Implement as proposed
**Pros:** [...]
**Cons:** [...]

### 5.2 Implement scaled-down version
**Pros:** [...]
**Cons:** [...]

### 5.3 Defer to v1.1 / next release
**Pros:** [...]
**Cons:** [...]

### 5.4 Reject (no change)
**Pros:** [...]
**Cons:** [...]

---

## 6. Recommendation
**tech-lead recommends:** [option] because [reason].

---

## 7. Decision

**Decision:** [Approved / Rejected / Deferred] on YYYY-MM-DD by [User]

**Decision notes:** [if any]

**Implementation plan (if approved):**
- [ ] Update SRS to v1.1
- [ ] Update HLD/LLD as needed
- [ ] Update RTM
- [ ] Implement code changes (assigned to: [agent])
- [ ] Add/update test cases (qa-engineer)
- [ ] Communicate to team

---

## 8. Audit Trail
| Date | Event | Actor |
|------|-------|-------|
| YYYY-MM-DD | CR raised | [actor] |
| YYYY-MM-DD | Impact analysis complete | tech-lead |
| YYYY-MM-DD | Submitted for decision | tech-lead |
| YYYY-MM-DD | [Approved / Rejected] | [User] |
| YYYY-MM-DD | Implementation complete | [agent] |
