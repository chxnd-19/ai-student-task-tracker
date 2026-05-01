# ✅ Release Checklist

Ensure every item is checked before tagging a new production release.

---

## 🏗️ Pre-Release Validation
- [ ] Run `npm run release-check` from the root.
- [ ] All API Contract checks pass.
- [ ] No hardcoded URLs in frontend services.

## 🐳 Environment & Build
- [ ] `docker-compose down -v` then `docker-compose up --build` runs cleanly.
- [ ] Nginx correctly serves the frontend at `http://localhost`.
- [ ] Backend is reachable at `http://localhost/api/health`.

## 🛡️ Functional & Security
- [ ] **Auth**: Login and Signup flows work correctly.
- [ ] **Rate Limiting**: Verified 429 response on `/auth/login` (if environment is set to production).
- [ ] **Observability**: Prometheus (`:9090`) and Grafana (`:3001`) are receiving data.

## 🚀 Post-Release Verification
- [ ] Verify `GET /api/version` returns the correct version number.
- [ ] Check browser console for unexpected errors.
- [ ] Tag the commit: `git tag -a vX.Y.Z -m "Release version X.Y.Z"`.
