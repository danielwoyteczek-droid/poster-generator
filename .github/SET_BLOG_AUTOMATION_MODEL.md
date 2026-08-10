Steps to update the `BLOG_AUTOMATION_MODEL` secret for GitHub Actions

1. Locally, verify desired model (example uses `claude-sonnet-4-6`).

2. Set the secret using `gh` (GitHub CLI):

```bash
# replace OWNER/REPO and the model string as needed
gh secret set BLOG_AUTOMATION_MODEL -b"claude-sonnet-4-6" --repo danielwoyteczek-droid/poster-generator
```

3. Alternatively, add or update the secret in the repository Settings → Secrets & variables → Actions.

4. Verify workflows reference `BLOG_AUTOMATION_MODEL` (see `.github/workflows/blog-scheduler.yml`).

Notes:
- Changing the secret only affects GitHub Actions runs; local `.env.local` controls local dev.
- To further reduce costs, also lower `BLOG_AUTOMATION_MONTHLY_BUDGET_USD` or change automation scheduling.
