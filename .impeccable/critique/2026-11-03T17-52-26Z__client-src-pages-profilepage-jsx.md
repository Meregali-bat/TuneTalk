---
target: tela de perfil
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/TuneTalk/client/src/pages/ProfilePage.jsx"
target_fingerprint: "sha256:9e5ddcc0c3024ec33e87b66eca6d51ab09778dfd0ad96ae2a661504d8361435e"
target_path: /home/user/TuneTalk/client/src/pages/ProfilePage.jsx
timestamp: 2026-11-03T17-52-26Z
slug: client-src-pages-profilepage-jsx
---
Method: dual-agent (A: design review · B: detector)

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Follow only shows disabled state |
| 2 | Match System / Real World | 3 | |
| 3 | User Control and Freedom | 2 | One-tap unfollow on touch; Trocar senha discards edits |
| 4 | Consistency and Standards | 2 | Discard check only in favorites; stats look alike |
| 5 | Error Prevention | 2 | Overlapping reorder/remove hit areas |
| 6 | Recognition Rather Than Recall | 3 | |
| 7 | Flexibility and Efficiency | 2 | Reorder only left |
| 8 | Aesthetic and Minimalist Design | 3 | Too many solid-green blocks |
| 9 | Error Recovery | 3 | |
| 10 | Help and Documentation | 2 | Badges only via title |
| **Total** | | **25/40** | **Acceptable** |

Priority: [P1] one-tap unfollow on touch; [P1] Editar perfil discards silently; [P2] editor slot buttons overlap; [P2] too many solid greens / FAB near CTA; [P3] stats affordance.
Detector: CLI clean; overlay dark-glow .composer-fab; nested-cards .post-card__music, .profile-favorites__vazio (mostly false positives).
