---
target: tela de perfil
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/user/TuneTalk/client/src/pages/ProfilePage.jsx"
target_fingerprint: "sha256:09332893350fa956ff973cf3771139446a9a63fd320578ad49e8627ebd1930c0"
target_path: /home/user/TuneTalk/client/src/pages/ProfilePage.jsx
timestamp: 2026-11-03T17-43-57Z
slug: client-src-pages-profilepage-jsx
---
Method: dual-agent (A: design review · B: detector)

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Follow failure silent; full reload on follow |
| 2 | Match System / Real World | 3 | Bare key icon |
| 3 | User Control and Freedom | 2 | One-tap unfollow; native confirm |
| 4 | Consistency and Standards | 2 | Three container treatments in a row |
| 5 | Error Prevention | 2 | Instant unfollow; Salvar enabled with no changes |
| 6 | Recognition Rather Than Recall | 2 | Editor hides per-category progress |
| 7 | Flexibility and Efficiency | 2 | No arrow-key tabs |
| 8 | Aesthetic and Minimalist Design | 2 | Favorites ~530px before posts |
| 9 | Error Recovery | 3 | Follow errors swallowed |
| 10 | Help and Documentation | 2 | Badges only via title |
| **Total** | | **23/40** | **Acceptable** |

Priority: [P1] editor Salvar scrolls away/progress hidden; [P1] instant unfollow + silent failure; [P2] favorites containment/height; [P2] titles break mid-word; [P2] password in header icon-only.
Detector: CLI clean; overlay dark-glow .composer-fab, nested-cards .post-card__music (shared, low).
