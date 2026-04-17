# EPIC: PermitSage Release Train Pipeline

## Status: PLANNING

## Summary

Replace hand-rolled PowerShell deployment scripts with state-of-the-art CI/CD using GitHub Actions, Bicep IaC, and a weekly release train model. Two repositories (BE + FE) with independent pipelines. Full partition isolation (dev/preprod/prod) with automated promotion, rollback, and hotfix support.

---

## Decisions (Locked)

| Decision | Answer | Rationale |
|----------|--------|-----------|
| Branch naming | `release/YYYY.WNN.D` | Verbose, self-documenting, sortable |
| Unused candidate branches | Keep forever | Traceability; they're lightweight |
| Container Registry | One shared ACR | Images are environment-agnostic; config differs per partition |
| Azure isolation | Separate RGs, same subscription | Strong isolation without subscription overhead |
| Caddy config | Checked into repo | Reproducible local dev setup |
| Test tiers | Tier 1 (unit, ~30s) + Tier 2 (integration, ~2min) | Both run in CI. Tier 3/4 (Claude API) are manual/nightly |
| Telemetry gate | Availability > 99.9%, health endpoint green | Codified in pipeline as HTTP checks + App Insights query |
| Approvers | catalin, david (cwf-group) | GitHub environment protection rules |
| IaC tool | Bicep | Native Azure, no state backend needed, what-if previews |
| CI/CD platform | GitHub Actions | Repo is in GitHub, natural fit |
| Repos | ps-backend (BE) + ps-frontend (FE) | Separate pipelines, same release train cadence |

---

## Architecture

### Partition Model

Three completely isolated partitions. No shared accounts, secrets, or storage.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     AZURE SUBSCRIPTION (shared)                         │
├──────────────────────┬──────────────────────┬───────────────────────────┤
│ rg-pscwf007-dev      │ rg-pscwf007-preprod  │ rg-pscwf007-prod         │
│                      │                      │                           │
│ Key Vault (dev)      │ Key Vault (preprod)  │ Key Vault (prod)          │
│ Storage (dev)        │ Storage (preprod)    │ Storage (prod)            │
│ App Insights (dev)   │ App Insights (pp)    │ App Insights (prod)       │
│ Container Apps (dev) │ Container Apps (pp)  │ Container Apps (prod)     │
│ Entra External ID    │ Entra External ID    │ Entra External ID         │
│ Azure AD apps (dev)  │ Azure AD apps (pp)   │ Azure AD apps (prod)      │
│                      │                      │                           │
│ + ACR (shared)       │                      │                           │
│   acrpscwf007        │  (pulls from same    │  (pulls from same         │
│                      │   ACR)               │   ACR)                    │
├──────────────────────┴──────────────────────┴───────────────────────────┤
│                                                                         │
│  Local dev machines also target rg-pscwf007-dev                        │
│  (via DefaultAzureCredential + Caddy reverse proxy)                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Local Development Setup

```
Engineer's Machine (dev partition credentials)
┌──────────────────────────────────────────────────────────────┐
│  C:\Windows\System32\drivers\etc\hosts:                      │
│    127.0.0.1  dev-api.permitsage.local                      │
│    127.0.0.1  dev-app.permitsage.local                      │
│                                                              │
│  Caddyfile (checked into repo):                             │
│    dev-api.permitsage.local {                               │
│      reverse_proxy localhost:5003                            │
│    }                                                         │
│    dev-app.permitsage.local {                               │
│      reverse_proxy localhost:3000                            │
│    }                                                         │
│                                                              │
│  Backend services (native Python, dev partition):           │
│    webapp        :5003  (Flask)                              │
│    doc-index-mcp :8010  (MCP server)                        │
│    permit-mcp    :8005  (MCP server)                        │
│                                                              │
│  Frontend (Next.js dev server):                              │
│    chat-ui       :3000                                       │
│                                                              │
│  Azure resources (dev partition):                            │
│    Key Vault, Storage, App Insights                          │
│    (via DefaultAzureCredential / az login)                  │
└──────────────────────────────────────────────────────────────┘
```

### Branching & Release Train

```
Week N timeline:

Mon     Tue     Wed     Thu         Fri     ║  Next week...
 │       │       │       │                   ║
 ▼       ▼       ▼       ▼                   ║
main ─────────────────────────────────────────────────►
 │       │       │       │
 │       │       │       │
 ├── release/2026.W13.1  │   Mon candidate (auto, if tests green)
 │    ├── release/2026.W13.2  Tue candidate (auto, if tests green)
 │    │    ├── release/2026.W13.3  Wed candidate (auto, if tests green)
 │    │    │       │
 │    │    │       ▼  Thu: Pick latest green candidate
 │    │    │       RC selection
 │    │    │       ├── Full test suite on candidate branch
 │    │    │       ├── Check dev telemetry (availability > 99.9%)
 │    │    │       ├── Create approval issue
 │    │    │       ├── WAIT: human approval (catalin or david)
 │    │    │       └── Deploy to PREPROD
 │    │    │
 │    │    │                        (one week later)
 │    │    │                        ├── Check preprod health
 │    │    │                        ├── WAIT: human approval
 │    │    │                        └── Deploy to PROD
 │    │    │                            (simultaneously: next RC → preprod)
```

**At any point, three branches are deployed:**

| Partition | Branch | Image Tag | Example |
|-----------|--------|-----------|---------|
| dev | `main` (HEAD) | `main-<sha7>` | `main-a1b2c3d` |
| preprod | `release/2026.W13.3` | `rc-2026.W13.3-<sha7>` | `rc-2026.W13.3-e4f5g6h` |
| prod | `release/2026.W12.3` | `rc-2026.W12.3-<sha7>` | `rc-2026.W12.3-i7j8k9l` |

### Hotfix Flow

```
Production issue discovered in release/2026.W12.3!

Step 1: Fix on main
  main ───[commit abc123: fix the bug]───►
  CI auto-deploys to Azure dev
  Validate fix works in dev

Step 2: Cherry-pick to preprod branch
  release/2026.W13.3 ───[cherry-pick abc123]───►
  Hotfix pipeline triggers
  Build + test from release branch
  Human approval (catalin or david)
  Deploy to preprod
  Validate fix in preprod

Step 3: Cherry-pick to prod branch
  release/2026.W12.3 ───[cherry-pick abc123]───►
  Hotfix pipeline triggers
  Build + test from release branch
  Human approval (catalin or david)
  Deploy to prod
  Validate fix in prod
```

### Rollback Strategy

Container Apps keeps previous revisions. Rollback = reactivate prior revision + shift traffic.

```
Rollback (automatic on deploy failure or manual trigger):
  1. Current revision: rc-2026.W13.3 receiving 100% traffic
  2. Deployment fails or regression detected
  3. Reactivate previous revision: rc-2026.W12.3
  4. Route 100% traffic to previous revision
  5. Deactivate failed revision
  6. Alert team via deployment notification
  No rebuild required. Instant. Previous image already in ACR.
```

---

## Pipeline Architecture

### Two Repos, Parallel Pipelines

```
ps-backend (BE)                          ps-frontend (FE)
├── .github/workflows/                   ├── .github/workflows/
│   ├── ci.yml                           │   ├── ci.yml
│   ├── deploy-dev.yml                   │   ├── deploy-dev.yml
│   ├── cut-candidate.yml                │   ├── cut-candidate.yml
│   ├── select-rc.yml                    │   ├── select-rc.yml
│   ├── promote-prod.yml                 │   ├── promote-prod.yml
│   ├── hotfix.yml                       │   ├── hotfix.yml
│   ├── provision-partition.yml          │   └── (FE doesn't provision infra)
│   └── deploy-infra.yml                 │
├── infra/                               │
│   ├── main.bicep                       │
│   ├── modules/                         │
│   └── parameters/                      │
│       ├── dev.bicepparam               │
│       ├── preprod.bicepparam           │
│       └── prod.bicepparam             │
├── Caddyfile.dev                        ├── Caddyfile.dev
└── deployment/ (legacy, being retired)  └── ...
```

### Pipeline Definitions

---

#### PIPELINE 1: CI -- PR Validation (both repos)

```yaml
# .github/workflows/ci.yml
# Trigger: pull_request -> main
# Purpose: Fast feedback on every PR
```

**BE steps:**
1. Checkout
2. Setup Python 3.12
3. Install dependencies (from pyproject.toml)
4. **Lint** -- `ruff check src/ tests/`
5. **Format check** -- `ruff format --check src/ tests/`
6. **Type check** -- `pyright src/`
7. **Tier 1 tests** -- `python -m pytest tests/ -m "not slow" --ignore=tests/agents/test_coordinator_to_permit_e2e.py -v` (~30s)
8. **Tier 2 tests** -- `python tests/run_tests.py --tier 2` (~2min, needs MCP server mocks or dockerized services)
9. **Security scan** -- `pip-audit`
10. **Docker build** -- build-only, no push (validates Dockerfile)
11. **IaC validation** -- `az bicep build` + `what-if` (only if `infra/` files changed)

**FE steps:**
1. Checkout
2. Setup Node 20
3. Install dependencies (`npm ci`)
4. **Lint** -- `eslint`
5. **Type check** -- `tsc --noEmit`
6. **Unit tests** -- `npm test`
7. **Build** -- `npm run build` (validates production build)
8. **Security scan** -- `npm audit`

---

#### PIPELINE 2: Deploy to Dev (both repos)

```yaml
# .github/workflows/deploy-dev.yml
# Trigger: push -> main (merge to main)
# Purpose: Every merge immediately goes to Azure dev partition
```

**BE steps:**
1. Checkout `main`
2. Login to Azure via OIDC (workload identity federation, dev partition)
3. Build Docker image, tag: `main-<sha7>`
4. Push to ACR (`acrpscwf007`)
5. Deploy 3 Container Apps in `rg-pscwf007-dev`:
   - `ca-pscwf007-webapp-dev`
   - `ca-pscwf007-docserver-dev`
   - `ca-pscwf007-permitserver-dev`
6. Wait for health checks (all 3 services healthy)
7. Run smoke tests against dev endpoints
8. On failure: rollback to previous revision, alert team

**FE steps:**
1. Checkout `main`
2. Login to Azure via OIDC (dev partition)
3. Build Docker image (or static export), tag: `main-<sha7>`
4. Push to ACR
5. Deploy FE Container App
6. Smoke test
7. On failure: rollback, alert

---

#### PIPELINE 3: Cut Release Candidate Candidate (BE + FE, scheduled)

```yaml
# .github/workflows/cut-candidate.yml
# Trigger: cron schedule Mon/Tue/Wed 06:00 UTC
# Purpose: Create a candidate branch if dev is healthy
```

**Steps:**
1. Check dev partition health:
   - All 3 BE services healthy (HTTP 200 on health endpoints)
   - FE healthy
   - App Insights availability > 99.9% in last 24h
2. Run full test suite (Tier 1 + Tier 2) against `main`
3. If any check fails: skip, log reason, exit clean
4. If all green:
   - Create branch `release/YYYY.WNN.D` from `main` HEAD
   - Tag the current dev images: `candidate-YYYY.WNN.D-<sha7>`
   - Push branch to origin
   - Log: "Candidate release/YYYY.WNN.D cut from main@<sha>"

---

#### PIPELINE 4: Select Release Candidate (BE + FE, scheduled Thu)

```yaml
# .github/workflows/select-rc.yml
# Trigger: cron Thursday 10:00 UTC
# Can also be triggered manually (workflow_dispatch)
# Purpose: Pick best candidate, validate, get approval, deploy to preprod
```

**Steps:**
1. Find latest candidate branch (Wed > Tue > Mon) for current week
2. If no candidates exist this week: exit, alert team
3. Run Tier 1 + Tier 2 tests against the candidate branch
4. Query App Insights (dev partition):
   - Availability > 99.9% over last 3 days
   - No unhandled exception spike
5. If checks fail: skip RC, alert team
6. If green:
   - Create GitHub deployment to `preprod` environment
   - **WAIT for human approval** (GitHub environment protection rule)
   - Approvers: catalin, david (cwf-group)
7. On approval:
   - Build images from candidate branch, tag: `rc-YYYY.WNN.D-<sha7>`
   - Push to ACR
   - Deploy BE (3 Container Apps) to `rg-pscwf007-preprod`
   - Deploy FE Container App to `rg-pscwf007-preprod`
   - Run preprod smoke tests
8. On deploy failure:
   - Rollback to previous preprod revision (reactivate prior Container Apps revision)
   - Alert team
   - Mark workflow as failed

---

#### PIPELINE 5: Promote to Prod (BE + FE, scheduled or manual)

```yaml
# .github/workflows/promote-prod.yml
# Trigger: cron following Thursday (1 week after RC) OR workflow_dispatch
# Purpose: Promote preprod release to prod
```

**Steps:**
1. Identify branch currently deployed to preprod
2. Check preprod health:
   - All services healthy for >= 5 days
   - Availability > 99.9%
3. Create GitHub deployment to `prod` environment
4. **WAIT for human approval** (catalin, david)
5. On approval:
   - Deploy same images (already in ACR) to `rg-pscwf007-prod`
   - Run prod smoke tests
6. On deploy failure:
   - Rollback to previous prod revision
   - Alert team
7. Simultaneously: Pipeline 4 can run to promote next RC to preprod

---

#### PIPELINE 6: Hotfix (BE + FE, manual trigger)

```yaml
# .github/workflows/hotfix.yml
# Trigger: workflow_dispatch
# Inputs:
#   target_branch: e.g., release/2026.W12.3
#   commit_sha: the fix commit from main
#   target_partition: preprod | prod
# Purpose: Cherry-pick a targeted fix to a release branch and deploy
```

**Steps:**
1. Validate inputs (branch exists, commit exists)
2. Checkout target branch
3. Cherry-pick the specified commit
4. Run Tier 1 + Tier 2 tests on the patched branch
5. Build images from patched branch, tag: `hotfix-<sha7>`
6. **WAIT for human approval** (catalin, david)
7. On approval:
   - Deploy to target partition
   - Run smoke tests
8. On failure: rollback to previous revision
9. Push cherry-pick commit to the release branch

---

#### PIPELINE 7: Provision New Partition (BE only, manual trigger)

```yaml
# .github/workflows/provision-partition.yml
# Trigger: workflow_dispatch
# Inputs:
#   base_name: e.g., pscwf007
#   environment: e.g., preview, staging, dev2
#   location: e.g., westus2
# Purpose: Create a completely new partition (new RG, KV, Storage, Apps, Identity)
```

**Steps:**
1. **WAIT for human approval** (catalin, david) -- partition creation is expensive
2. Validate inputs (base_name format, environment name uniqueness)
3. Login to Azure via OIDC
4. Create Bicep parameter file for new partition
5. Deploy Bicep:
   - Resource Group: `rg-{base}-{env}`
   - Key Vault: `kv-{base}-{env}`
   - Storage Account: `st{base}{env}`
   - App Insights + Log Analytics
   - Container Apps Environment
   - Container Apps (3x BE + 1x FE)
   - RBAC: Managed identity -> Key Vault, Storage
6. Run identity provisioning:
   - Azure AD apps (service-to-service)
   - Entra External ID (user auth)
7. Seed initial data (compliance docs, document indexes)
8. Deploy current `main` images to new partition
9. Run smoke tests
10. Output: partition config summary (URLs, resource names)

---

#### PIPELINE 8: Deploy Infrastructure Changes (BE only, manual trigger)

```yaml
# .github/workflows/deploy-infra.yml
# Trigger: workflow_dispatch OR on push to main when infra/ files change
# Inputs:
#   partition: dev | preprod | prod | preview | ...
# Purpose: Apply Bicep changes to an existing partition
```

**Steps:**
1. If prod/preprod: **WAIT for human approval**
2. `az deployment group what-if` -- show planned changes
3. `az deployment group create` -- apply Bicep
4. Verify resources healthy after changes

---

## Infrastructure-as-Code (Bicep)

### Module Structure

```
infra/
├── main.bicep                    # Orchestrator: composes all modules
├── modules/
│   ├── resource-group.bicep      # (deployed at subscription scope)
│   ├── container-registry.bicep  # ACR (shared, deployed once)
│   ├── key-vault.bicep           # Key Vault + access policies
│   ├── storage-account.bicep     # Blob storage + containers
│   ├── monitoring.bicep          # App Insights + Log Analytics workspace
│   ├── container-environment.bicep # Container Apps Environment
│   ├── container-app.bicep       # Single Container App (reusable for all 3+1)
│   └── rbac.bicep                # Managed identity role assignments
├── parameters/
│   ├── dev.bicepparam            # Dev partition parameters
│   ├── preprod.bicepparam        # Preprod partition parameters
│   ├── prod.bicepparam           # Prod partition parameters
│   └── (new partitions added here)
└── scripts/
    └── deploy.sh                 # Thin wrapper: az deployment sub create
```

### What Bicep Replaces

| Current Script | Bicep Module |
|----------------|--------------|
| `02-create-resource-group.ps1` | `resource-group.bicep` |
| `03-create-container-registry.ps1` | `container-registry.bicep` |
| `04-create-app-insights.ps1` | `monitoring.bicep` |
| `04a-create-storage-account.ps1` | `storage-account.bicep` |
| `05-create-key-vault.ps1` | `key-vault.bicep` |
| `06-create-container-environment.ps1` | `container-environment.bicep` |
| `08-deploy-container-apps.ps1` | `container-app.bicep` (x4) |
| `09-configure-dns.ps1` | Part of `container-app.bicep` |

### What Stays as Scripts

| Script | Why |
|--------|-----|
| `AzureAD/*.ps1` | Microsoft Graph API for app registrations; poorly supported in Bicep |
| `AzureEntraExternalID/*.ps1` | External ID tenant creation; no Bicep support |
| `07-build-and-push-images.ps1` | Replaced by GitHub Actions Docker build step |
| `switch-environment.ps1` | Local dev convenience; still useful |

---

## GitHub Configuration

### Environments (Settings -> Environments)

| Environment | Protection Rules | Reviewers |
|-------------|-----------------|-----------|
| `dev` | None (auto-deploy) | -- |
| `preprod` | Required reviewers | catalin, david |
| `prod` | Required reviewers + wait timer (5 days after preprod) | catalin, david |

### OIDC Federation (no stored secrets)

Each environment gets a federated credential in Azure AD:

```
GitHub OIDC → Azure AD App Registration → Managed Identity
  Subject: repo:org/ps-backend:environment:dev
  Subject: repo:org/ps-backend:environment:preprod
  Subject: repo:org/ps-backend:environment:prod
  Subject: repo:org/ps-frontend:environment:dev
  Subject: repo:org/ps-frontend:environment:preprod
  Subject: repo:org/ps-frontend:environment:prod
```

No client secrets stored in GitHub. Tokens are short-lived and scoped to the specific environment.

### Branch Protection (main)

- Require pull request before merging
- Require CI status checks to pass (ci.yml)
- Require 1 reviewer approval (from cwf-group)
- No force push
- No deletions
- Include administrators

### Branch Protection (release/**)

- No force push (except via hotfix pipeline)
- No deletions
- Direct push only from hotfix pipeline (via GitHub App or PAT)

---

## Phased Implementation Plan

### Phase 0: Foundation (Week 1)

| # | Bead | Description | Blocked By |
|---|------|-------------|------------|
| 0.1 | OIDC Federation Setup | Create Azure AD app registration with federated credentials for GitHub Actions. One app per repo, three federated subjects (dev/preprod/prod). | -- |
| 0.2 | GitHub Environments | Create dev, preprod, prod environments. Add catalin + david as required reviewers for preprod + prod. | 0.1 |
| 0.3 | Branch Protection | Configure main: require PR, CI pass, 1 reviewer. Configure release/**: no force push, no delete. | -- |
| 0.4 | Dependabot | Enable Dependabot for pip (BE) and npm (FE). Weekly schedule. | -- |
| 0.5 | Caddy Local Dev | Create `Caddyfile.dev`, document hosts file setup, test with local services against dev partition. | -- |

### Phase 1: CI Pipeline (Week 2)

| # | Bead | Description | Blocked By |
|---|------|-------------|------------|
| 1.1 | BE CI Workflow | `ci.yml` for ps-backend: lint (ruff), type check (pyright), Tier 1 tests, Tier 2 tests, pip-audit, Docker build validation. | 0.1 |
| 1.2 | FE CI Workflow | `ci.yml` for ps-frontend: lint (eslint), type check (tsc), unit tests, build validation, npm audit. | 0.1 |
| 1.3 | IaC Validation | Add Bicep what-if step to CI (only runs when `infra/` changes). | 2.1 |

### Phase 2: Infrastructure-as-Code (Weeks 2-3)

| # | Bead | Description | Blocked By |
|---|------|-------------|------------|
| 2.1 | Bicep Core Modules | Write Bicep for: RG, ACR, KV, Storage, App Insights, Log Analytics. | -- |
| 2.2 | Bicep Container Apps | Write Bicep for: Container Environment, Container App (parameterized for all 4 apps), RBAC assignments. | 2.1 |
| 2.3 | Bicep Parameters | Create parameter files for dev, preprod, prod. Validate against existing resources. | 2.2 |
| 2.4 | Deploy Infra Workflow | `deploy-infra.yml` with what-if preview + apply. Manual trigger. Approval for preprod/prod. | 2.3, 0.2 |
| 2.5 | Provision Partition Workflow | `provision-partition.yml` for creating new partitions from scratch (includes identity scripts). | 2.4 |
| 2.6 | Validate & Retire | Deploy Bicep to dev, compare with existing resources. Retire PowerShell provisioning scripts (keep for reference). | 2.5 |

### Phase 3: Dev Deployment (Week 3)

| # | Bead | Description | Blocked By |
|---|------|-------------|------------|
| 3.1 | BE Deploy Dev Workflow | `deploy-dev.yml`: build, push to ACR, deploy 3 Container Apps, smoke test. Triggers on push to main. | 0.1, 1.1 |
| 3.2 | FE Deploy Dev Workflow | `deploy-dev.yml` for frontend: build, push, deploy, smoke test. | 0.1, 1.2 |
| 3.3 | Smoke Test Suite | Write smoke test script: health checks, basic API call, response validation. Reusable across all partitions. | 3.1 |
| 3.4 | Rollback Action | Reusable GitHub Action or composite step: reactivate previous Container Apps revision, shift traffic. | 3.1 |

### Phase 4: Release Train (Weeks 4-5)

| # | Bead | Description | Blocked By |
|---|------|-------------|------------|
| 4.1 | Cut Candidate Workflow | `cut-candidate.yml`: cron Mon/Tue/Wed, check dev health, run tests, create branch if green. | 3.1, 3.2 |
| 4.2 | Select RC Workflow | `select-rc.yml`: cron Thu, pick latest candidate, validate, request approval, deploy to preprod. | 4.1, 3.4 |
| 4.3 | Promote Prod Workflow | `promote-prod.yml`: cron or manual, check preprod health, request approval, deploy to prod. | 4.2, 3.4 |
| 4.4 | Telemetry Gate Script | Script to query App Insights: availability > 99.9%, error rate, latency. Used by 4.1, 4.2, 4.3. | 3.1 |

### Phase 5: Hotfix Pipeline (Week 5)

| # | Bead | Description | Blocked By |
|---|------|-------------|------------|
| 5.1 | Hotfix Workflow | `hotfix.yml`: manual trigger, cherry-pick, build, test, approval, deploy to target partition. | 3.4, 4.2 |
| 5.2 | Hotfix Runbook | Document: how to identify fix commit, which branch to target, approval process, validation steps. | 5.1 |

### Phase 6: Hardening (Weeks 5-6)

| # | Bead | Description | Blocked By |
|---|------|-------------|------------|
| 6.1 | Container Image Scanning | Add Trivy scan to Docker build step in all deploy workflows. | 3.1 |
| 6.2 | CodeQL | Enable GitHub CodeQL for Python (BE) and TypeScript (FE). | 1.1, 1.2 |
| 6.3 | Deployment Notifications | Notify Teams/Slack on: deploy success/failure, RC approval needed, rollback triggered. | 3.1 |
| 6.4 | Cost Alerts | Azure cost alert per RG (dev/preprod/prod) -- Bicep resource. | 2.3 |
| 6.5 | Release Notes | Auto-generate changelog from commits between releases (GitHub Release + auto-notes). | 4.2 |

### Phase 7: Identity Provisioning (Week 6, low priority)

| # | Bead | Description | Blocked By |
|---|------|-------------|------------|
| 7.1 | Azure AD in GH Actions | Wrap existing PowerShell scripts in a GitHub Actions workflow for audit trail. | 0.1, 2.5 |
| 7.2 | Entra External ID in GH Actions | Wrap existing PowerShell scripts in a GitHub Actions workflow. | 0.1, 2.5 |

---

## Dependency Graph

```
Phase 0 (Foundation)
  0.1 OIDC ──────────┬──────────► 1.1 BE CI
  0.2 Environments ──┤            1.2 FE CI
  0.3 Branch Prot.   │              │
  0.4 Dependabot     │              │
  0.5 Caddy          │              ▼
                     │     ┌──► 3.1 BE Deploy Dev ──► 3.3 Smoke Tests
                     │     │    3.2 FE Deploy Dev      3.4 Rollback Action
                     │     │         │                      │
                     ▼     │         ▼                      ▼
              2.1 Bicep Core  4.1 Cut Candidate ──► 4.2 Select RC
              2.2 Bicep Apps       4.4 Telemetry      │
              2.3 Bicep Params                        ▼
              2.4 Deploy Infra              4.3 Promote Prod
              2.5 Provision                   │
              2.6 Validate                    ▼
                     │                 5.1 Hotfix
                     │                 5.2 Runbook
                     ▼
              7.1 Azure AD GHA         6.1 Trivy
              7.2 Entra ID GHA        6.2 CodeQL
                                       6.3 Notifications
                                       6.4 Cost Alerts
                                       6.5 Release Notes
```

---

## Weekly Cadence (Steady State)

| Day | Automated Action | Deployed Where |
|-----|-----------------|----------------|
| **Continuous** | PRs validated by CI. Merges to main auto-deploy to dev. | dev |
| **Monday** | 06:00 UTC: Cut candidate `release/YYYY.WNN.1` if dev healthy | (branch only) |
| **Tuesday** | 06:00 UTC: Cut candidate `release/YYYY.WNN.2` if dev healthy | (branch only) |
| **Wednesday** | 06:00 UTC: Cut candidate `release/YYYY.WNN.3` if dev healthy | (branch only) |
| **Thursday** | 10:00 UTC: Select RC from latest candidate. Validate. Request approval. | preprod (after approval) |
| **Thursday** | 10:00 UTC: Also promote previous week's RC to prod (if healthy). | prod (after approval) |
| **Friday** | Monitor preprod. Hotfixes if needed. | -- |

---

## Migration Strategy

The migration from hand-rolled PowerShell to GitHub Actions + Bicep happens incrementally:

1. **Phase 0-1**: New CI workflows run alongside existing process. No disruption.
2. **Phase 2**: Bicep deployed to dev first. Compared with existing resources. No destruction of existing infra.
3. **Phase 3**: Dev deployment via GitHub Actions replaces manual `07-build-and-push-images.ps1` + `08-deploy-container-apps.ps1`.
4. **Phase 4-5**: Release train replaces manual deployment process entirely.
5. **Phase 2.6**: Once Bicep is validated across all partitions, PowerShell provisioning scripts are archived (not deleted) in a `deployment/legacy/` folder.

**Zero-downtime migration**: At no point do we destroy existing infrastructure. Bicep deployments are additive/updating. Old scripts remain functional as fallback until Bicep is fully validated.

---

## Files to Create (BE repo)

```
.github/
├── workflows/
│   ├── ci.yml
│   ├── deploy-dev.yml
│   ├── cut-candidate.yml
│   ├── select-rc.yml
│   ├── promote-prod.yml
│   ├── hotfix.yml
│   ├── provision-partition.yml
│   └── deploy-infra.yml
├── actions/
│   ├── rollback/action.yml          # Reusable rollback composite action
│   ├── smoke-test/action.yml        # Reusable smoke test composite action
│   └── telemetry-gate/action.yml    # Reusable telemetry health check
└── CODEOWNERS

infra/
├── main.bicep
├── modules/
│   ├── container-registry.bicep
│   ├── key-vault.bicep
│   ├── storage-account.bicep
│   ├── monitoring.bicep
│   ├── container-environment.bicep
│   ├── container-app.bicep
│   └── rbac.bicep
└── parameters/
    ├── dev.bicepparam
    ├── preprod.bicepparam
    └── prod.bicepparam

Caddyfile.dev
docs/RELEASE_TRAIN_EPIC.md          # This document
docs/HOTFIX_RUNBOOK.md              # Created in Phase 5
```

## Files to Create (FE repo)

```
.github/
├── workflows/
│   ├── ci.yml
│   ├── deploy-dev.yml
│   ├── cut-candidate.yml
│   ├── select-rc.yml
│   ├── promote-prod.yml
│   └── hotfix.yml
├── actions/
│   ├── rollback/action.yml
│   └── smoke-test/action.yml
└── CODEOWNERS

Caddyfile.dev
```
