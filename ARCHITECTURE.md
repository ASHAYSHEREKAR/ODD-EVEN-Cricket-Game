# 🏛️ System Architecture Specification

This document provides a comprehensive technical breakdown of the architecture, subsystem design, 2.5D rendering pipeline, procedural physics, and multiplayer synchronization protocols for the **Even/Odd Cricket Game**.

---

## 1. High-Level Subsystem Architecture

The project employs a synchronized dual-engine architecture:
- **Client Presentation & Interaction Engine (JavaScript ES6+ & HTML5 Canvas):** Responsible for 60 FPS 2.5D rendering, procedural character animations, responsive DOM layout, spatial audio synthesis, and WebRTC P2P networking.
- **Authoritative Rule & Simulation Engine (Python 3.10+):** Enforces state validation, headless simulations, and strict adherence to the Even/Odd accounting rules.

```mermaid
graph TD
    subgraph "Client Layer (Browser Runtime)"
        UI[UIController<br/>DOM Views & HUD]
        AC[AnimationController<br/>Timing Windows & FX]
        CR[CanvasRenderer<br/>2.5D Perspective Engine]
        APP[CricketGameApp<br/>Master Application Orchestrator]
        GS[GameState<br/>Client State Container]
        GL[GameLogic<br/>Rule Matrix & Shot Resolution]
        MP[MultiplayerManager<br/>PeerJS WebRTC Sync]
        AUD[Utils.AudioContext<br/>Web Audio Synthesizer]
    end

    subgraph "Backend Core (Python Engine)"
        ENG[CricketMatchEngine<br/>State Transitions & Invariants]
        MOD[Models<br/>Enums, Dataclasses, History]
        AI[AIOpponent<br/>Strategy Matrix]
        CLI[CLIRunner<br/>Batch Simulation Harness]
    end

    APP --> UI
    APP --> AC
    APP --> GS
    APP --> GL
    APP --> MP
    AC --> CR
    AC --> AUD
    GL --> GS
    UI --> GS

    ENG --> MOD
    ENG --> AI
    CLI --> ENG
```

---

## 2. Ball Lifecycle & Delivery Sequence

The delivery lifecycle manages asynchronous bowler run-up, 3D projectile flight, batsman decision timing, outcome evaluation, and bank accounting.

```mermaid
sequenceDiagram
    autonumber
    participant App as CricketGameApp
    participant AC as AnimationController
    participant CR as CanvasRenderer
    participant User as Batsman / Input
    participant GL as GameLogic
    participant GS as GameState
    participant UI as UIController

    App->>AC: startBowlerDelivery(speed, variation)
    AC->>CR: triggerPitchDelivery(speed, variation)
    Note over CR: 3D Flight: Run-up -> Pitch Bounce -> Crease Arrival
    AC-->>App: Return contactWindow { startTime, contactTime, duration }

    alt Human Swings or Defends
        User->>App: handlePlayerBattingAction(isDefensive)
        App->>GL: calculateShotOutcome(timingOffset, isDefensive)
        GL-->>App: Return outcome { runs, isWicket, rating }
    else Ball Passes (No Action)
        AC-->>App: Timeout expiration (Missed ball)
        App->>GL: calculateShotOutcome(offset, false) -> 0 runs / dot
    end

    App->>GL: processDelivery(runs, isWicket)
    GL->>GS: Deduct 1 ball + apply rule delta modifier (+1, 0, -1)
    GL->>GS: Update score (runs, wickets, shot classification)
    GL-->>App: Return DeliveryResult { delta, netChange, remaining, status }

    App->>CR: triggerHit(runs) OR triggerWicket()
    App->>AC: showFloatingBadge(delta)
    App->>UI: updateScoreboard() & showCommentary()

    opt Innings / Match State Change
        alt Status == 'INNINGS_1_OVER'
            App->>UI: showInningsBreakScreen(target, newBatting)
        else Status == 'MATCH_OVER'
            App->>GS: finishMatch()
            App->>UI: showMatchResult()
        end
    end
```

---

## 3. 2.5D Canvas Rendering & Procedural Physics

The rendering engine in [`js/canvas-renderer.js`](js/canvas-renderer.js) uses a 2.5D perspective vanishing projection model:

### A. Coordinate Transformation
- **Vertical Ratio:** $Y_{\text{progress}} = \frac{Y - Y_{\text{top}}}{Y_{\text{bottom}} - Y_{\text{top}}}$
- **Perspective Scale:** $\text{Scale}(Y) = 0.55 + 0.55 \times Y_{\text{progress}}$
- **3D Altitude Projection:** $Y_{\text{projected}} = Y - Z_{\text{altitude}}$

### B. Lateral Curve & Seam/Spin Formulas
1. **In-Swinger:**
   $$\text{Offset}(p) = \begin{cases} \sin\left(\frac{p}{p_{\text{bounce}}} \pi\right) \times 10 & p < p_{\text{bounce}} \\ 10 - \left(\frac{p - p_{\text{bounce}}}{1 - p_{\text{bounce}}}\right) \times 24 & p \ge p_{\text{bounce}} \end{cases}$$
2. **Out-Swinger:**
   $$\text{Offset}(p) = \begin{cases} -\sin\left(\frac{p}{p_{\text{bounce}}} \pi\right) \times 6 & p < p_{\text{bounce}} \\ -6 + \left(\frac{p - p_{\text{bounce}}}{1 - p_{\text{bounce}}}\right) \times 20 & p \ge p_{\text{bounce}} \end{cases}$$
3. **Googly Spin:**
   $$\text{Offset}(p) = \begin{cases} -\sin\left(\frac{p}{p_{\text{bounce}}} \pi\right) \times 12 & p < p_{\text{bounce}} \\ -12 + \left(\frac{p - p_{\text{bounce}}}{1 - p_{\text{bounce}}}\right) \times 26 & p \ge p_{\text{bounce}} \end{cases}$$

---

## 4. WebRTC Multiplayer Synchronization Protocol

The online mode uses PeerJS DataChannels for low-latency peer-to-peer state replication.

```mermaid
sequenceDiagram
    participant Host as Host (Player 1)
    participant Peer as Peer (Player 2)

    Host->>Peer: START_TOSS { winner, balls }
    Note over Host,Peer: 3D Coin Toss Animation Executes on Both Clients

    alt Winner is Host
        Host->>Peer: TOSS_CHOICE { preference, balls, winner }
    else Winner is Peer
        Peer->>Host: TOSS_CHOICE { preference, balls, winner }
    end

    Note over Host,Peer: Match Starts -> Innings 1 Initialized

    loop Delivery Loop (Active Innings)
        Host->>Peer: DELIVERY_START { speed, variation }
        Note over Host,Peer: CanvasRenderer triggers identical ball curve & speed
        
        alt Peer is Batting
            Peer->>Host: BAT_ACTION { timingOffset, isDefensive }
            Host->>Host: resolveDeliveryOutcome(outcome)
        else Host is Batting
            Host->>Host: resolveDeliveryOutcome(outcome)
        end
    end

    opt Innings 2 Switch
        Host->>Peer: INNINGS_2_START {}
    end
```

---

## 5. Security, Storage & Cache Integrity
- **Stateless Networking:** No server database or authentication tokens required.
- **Local Storage Isolation:** High scores and player aliases are scoped to `localStorage` with error-guarded fallbacks.
- **Service Worker & Cache Busters:** Every static asset link includes strict version query parameters (`?v=19.0`) with automatic cache-clearing listeners in `service-worker.js`.
