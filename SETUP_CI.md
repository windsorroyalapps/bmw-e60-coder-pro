# Enable GitHub Actions CI (30 Seconds)

Your repo has the workflow file at `workflows/build.yml`. GitHub Actions requires it to be in `.github/workflows/`. Here's how to enable it:

## Option 1: Web UI (Easiest)

1. Open your repo on GitHub
2. Click **Actions** tab
3. Click **New workflow**
4. Click **set up a workflow yourself**
5. Delete the default content
6. Copy everything from [`workflows/build.yml`](./workflows/build.yml)
7. Paste it into the editor
8. Click **Commit changes...**
9. Done!

## Option 2: Git Command Line

```bash
git clone https://github.com/windsorroyalapps/bmw-e60-coder-pro.git
cd bmw-e60-coder-pro
mkdir -p .github/workflows
cp workflows/build.yml .github/workflows/build.yml
git add .github/workflows/build.yml
git commit -m "ci: enable GitHub Actions"
git push
```

## What Happens Next

- Every push to `main` triggers a build
- Every `v*` tag (e.g., `v1.0.0`) creates a release with:
  - `BMW-E60-Coder-Pro-web.zip` — web build
  - `BMW-E60-Coder-Pro.apk` — Android debug APK

## Manual Release

```bash
# Create a tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will auto-create the release with assets
```
