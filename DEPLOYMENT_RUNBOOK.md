# TikTakToe Deployment Runbook

This runbook covers manual GitHub configuration required by the release-train workflows.

## 1. Confirm Default Branch

1. In GitHub, open repository settings.
2. Confirm default branch is `master`.
3. Keep workflow triggers compatible with both `main` and `master` while migration is in progress.

## 2. Create GitHub Environments

Create these environments in repository settings:

1. `dev`
2. `preprod`
3. `prod`

Required protection rules:

1. `dev`: no required reviewers.
2. `preprod`: required reviewers (repo owners).
3. `prod`: required reviewers and a wait timer.

## 3. Add Environment Secrets

Set the following secrets in each matching environment:

1. `dev`: `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV`
2. `preprod`: `AZURE_STATIC_WEB_APPS_API_TOKEN_PREPROD`
3. `prod`: `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD`

## 4. Add Environment Variables

Set these variables in matching environments:

1. `dev`: `DEV_URL`
2. `preprod`: `PREPROD_URL`
3. `prod`: `PROD_URL`

Use full URLs (for example `https://<your-app>.azurestaticapps.net`).

## 5. Configure Branch Protection

### Branch `master`

1. Require pull request before merge.
2. Require status checks to pass.
3. Require at least 1 approval.
4. Disable force pushes.
5. Disable branch deletion.

### Branch pattern `release/**`

1. Disable force pushes.
2. Disable branch deletion.

## 6. Validate Workflows

Run these checks after setup:

1. Open Actions and run `CI` on a test PR.
2. Merge to `master` and verify `Deploy to Dev` succeeds.
3. Manually dispatch `Cut Release Candidate`.
4. Manually dispatch `Select Release Candidate` with and without explicit branch input.
5. Manually dispatch `Promote to Production` using a known release branch.
6. Manually dispatch `Hotfix` against preprod first, then prod.

## 7. Deferred OIDC Hardening

Current workflows use environment-scoped SWA API tokens.
OIDC permissions (`id-token: write`) are already present for future migration.

When ready:

1. Create Azure federated credentials for GitHub Actions.
2. Grant least-privilege access per environment.
3. Replace token-based SWA auth in workflows with OIDC-based auth.

## 8. Rollback Procedure

If a deployment introduces regressions:

1. Go to Azure Static Web Apps portal.
2. Find previous known-good deployment.
3. Redeploy or promote that deployment.
4. Validate app health via environment URL.
5. Record incident and hotfix decision in release notes.
