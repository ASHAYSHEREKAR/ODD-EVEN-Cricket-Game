# Cricket Game — Documentation Agent Operating Rules

> **Project:** Even/Odd Strategic Cricket Game (Google Doodle Inspired)  
> **Role:** Technical Documentation, Rule Synchronization & Guide Authoring  
> **Reference:** [`AGENT.md`](file:///c:/Users/Ashay/Desktop/CricketGame/AGENT.md) | [`TESTING_AGENT.md`](file:///c:/Users/Ashay/Desktop/CricketGame/TESTING_AGENT.md) | [`README.md`](file:///c:/Users/Ashay/Desktop/CricketGame/README.md)

---

## 1. Purpose & Scope

The **Documentation Agent** is responsible for ensuring that all technical documentation, developer guidelines, architectural specifications, API references, test guides, and in-game player tutorials accurately reflect the true, live state of the codebase.

### Primary Responsibilities:
1. **Rule & Feature Parity:** Whenever new mechanics, rules, or settings are added (e.g., Difficulty levels, Consecutive penalty strikes, Over configurations, Networking protocols), ensure they are documented across all relevant markdown files and in-game screens.
2. **In-Game Tutorial & UI Copy Integrity:** Maintain the accuracy of [`index.html`](file:///c:/Users/Ashay/Desktop/CricketGame/index.html)'s *How to Play* section, controls guides, commentary presets, and HUD badges.
3. **Architectural & Flow Accuracy:** Update Mermaid diagrams, sequence flows, data structures, and state transitions in [`ARCHITECTURE.md`](file:///c:/Users/Ashay/Desktop/CricketGame/ARCHITECTURE.md).
4. **API Completeness:** Keep [`API_REFERENCE.md`](file:///c:/Users/Ashay/Desktop/CricketGame/API_REFERENCE.md) comprehensive for all JavaScript client modules and Python backend packages.
5. **Cross-Linking & Formatting:** Ensure all markdown documents have valid clickable file links (`file:///...`), clear GitHub-flavored markdown formatting, and consistent terminology.

---

## 2. Documentation Ecosystem Map

```text
CricketGame/
├── README.md                  # Project overview, quickstart, gameplay guide & feature matrix
├── AGENT.md                   # Development Agent directives, invariants & code standards
├── TESTING_AGENT.md           # Testing Agent quality gates, audit protocols & test matrix
├── DOCUMENTATION_AGENT.md     # Documentation Agent directives & doc integrity rules (This file)
├── ARCHITECTURE.md            # Subsystems, 2.5D canvas pipeline & WebRTC protocol
├── API_REFERENCE.md           # JavaScript and Python class/method API documentation
├── TESTING_GUIDE.md           # Test suite execution cheat sheet & CLI commands
├── index.html                 # In-game rules modal, HUD labels & UI tutorials
└── .agents/
    └── AGENTS.md              # Central agent registry & role definitions
```

---

## 3. Documentation Protocols & Checklists

When updating documentation for new features or rule changes, the Documentation Agent must verify each of the following:

### Checklist for Rule / Feature Changes:
- [ ] **Core Rule Matrix:** Is the rule updated in [`README.md`](file:///c:/Users/Ashay/Desktop/CricketGame/README.md), [`AGENT.md`](file:///c:/Users/Ashay/Desktop/CricketGame/AGENT.md), and [`index.html`](file:///c:/Users/Ashay/Desktop/CricketGame/index.html)?
- [ ] **Architecture Flows:** Are state flowcharts, sequence diagrams, and subsystem diagrams in [`ARCHITECTURE.md`](file:///c:/Users/Ashay/Desktop/CricketGame/ARCHITECTURE.md) updated?
- [ ] **API Reference:** Are new methods, parameters, return types, and storage keys documented in [`API_REFERENCE.md`](file:///c:/Users/Ashay/Desktop/CricketGame/API_REFERENCE.md)?
- [ ] **Testing Guides:** Are verification commands or new test cases added to [`TESTING_GUIDE.md`](file:///c:/Users/Ashay/Desktop/CricketGame/TESTING_GUIDE.md)?
- [ ] **In-Game Copy:** Are tutorial descriptions, commentary strings, and button shortcut labels clear and unambiguous?

---

## 4. Ground-Truth Rule Matrix Reference

### A. Dynamic Ball Bank Matrix

| Ball Preference | Event | Ball Quota Delta ($\Delta$) | Net Balls Change ($-1 + \Delta$) | Score / Wicket Effect |
| :--- | :--- | :---: | :---: | :--- |
| **Preferred Ball** | Runs Scored ($>0$) | **$+1$** (Bonus) | **$0$** (Innings extended!) | Runs added to score |
| **Preferred Ball** | Dot Ball ($0$) | **$-1$** (Penalty) | **$-2$** (Double deduction) | Score unchanged |
| **Preferred Ball** | Wicket | **$-1$** (Penalty) | **$-2$** (Double deduction) | $+1$ Wicket |
| **Non-Preferred Ball** | Runs Scored ($>0$) | **$-1$** (Penalty) | **$-2$** (Double deduction) | Runs added to score |
| **Non-Preferred Ball** | Dot Ball ($0$) | **$0$** (Safe) | **$-1$** (Standard 1 delivery bowled) | Score unchanged |
| **Non-Preferred Ball** | Wicket | **$-1$** (Penalty) | **$-2$** (Double deduction) | $+1$ Wicket |

### B. Strategic 3-Strike Non-Preferred Wicket Penalty
- Scoring runs ($>0$) on non-preferred balls **3 consecutive times** without defending results in an immediate **$+1$ WICKET PENALTY**.
- A safe dot ball (or defending with key **`D`**) resets the risky streak counter back to **0**.

### C. Difficulty Level Parameters

| Parameter | 🟢 Low (Easy) | 🟡 Medium (Normal) | 🔴 High (Pro) |
| :--- | :--- | :--- | :--- |
| **Delivery Speed / Flight Time** | ~1310ms (Gentle) | 1050ms (Standard) | ~820ms (Express) |
| **Sweet Spot Window (4s & 6s)** | $\pm 130\text{ ms}$ | $\pm 95\text{ ms}$ | $\pm 65\text{ ms}$ |
| **Single / Double Window** | $\pm 240\text{ ms}$ | $\pm 195\text{ ms}$ | $\pm 140\text{ ms}$ |
| **Mistimed Wicket Probability** | 10% | 25% | 45% |
| **AI Preferred Ball Boundary Rate**| ~50% | ~65% | ~80% |
| **AI Non-Preferred Defense Rate** | 55% | 80% | 92% (Ruthless) |
