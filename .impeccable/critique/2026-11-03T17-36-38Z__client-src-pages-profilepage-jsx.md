---
target: tela de perfil
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/TuneTalk/client/src/pages/ProfilePage.jsx"
target_fingerprint: "sha256:049f300e9abbcd3205de86acc682c500c6cb34f3e1a4d56412091c935aa1472e"
target_path: /home/user/TuneTalk/client/src/pages/ProfilePage.jsx
timestamp: 2026-11-03T17-36-38Z
slug: client-src-pages-profilepage-jsx
---
Method: dual-agent (A: design review · B: detector)

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | No confirmation after saving profile/favorites |
| 2 | Match System / Real World | 3 | "Nota média" unexplained |
| 3 | User Control and Freedom | 2 | Favorites editor discards picks on close without asking |
| 4 | Consistency and Standards | 3 | Favorites empty state vs. other empty states |
| 5 | Error Prevention | 3 | Good validation |
| 6 | Recognition Rather Than Recall | 2 | Key icon only; favorite titles truncated, full name only in title attr |
| 7 | Flexibility and Efficiency | 2 | One-step reorder only |
| 8 | Aesthetic and Minimalist Design | 3 | Favorites block floats between card and tabs |
| 9 | Error Recovery | 2 | Raw error, no retry |
| 10 | Help and Documentation | 2 | Badges explained only via title tooltips |
| **Total** | | **25/40** | **Acceptable** |

Priority issues:
- [P1] Favorites dead end and illegible on mobile (ProfileFavorites.jsx, .favorites-grid__titulo/.favorites-grid__artista 10.88px)
- [P1] Content buried under tall header; tabs not sticky
- [P2] Weak empty favorites prompt; editor starts cold
- [P2] Small touch targets (editor tools 23px), icon-only Trocar senha
- [P2] Error/unsaved-change recovery (no retry, no discard confirmation, no saved notice)

Detector: CLI 0 (regex-only); overlay: low-contrast .app-badge 3.2:1, tiny/undersized text .favorites-grid__artista, nested-cards .post-card__music (false positive: media embed), dark-glow composer FAB (soft elevation, weak).
