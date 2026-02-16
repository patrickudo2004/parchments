---
description: How to release a new version of Parchments with updated installers
---

Follow these steps to ensure your latest code changes are "baked" into the downloadable installers on GitHub:

## 1. Finalize and Push Code
Ensure all your tweaks are working locally, then push them to the main repository.
```bash
git add .
git commit -m "feat: your descriptive message"
git push
```

## 2. Create a Version Tag
Tags are the "trigger" for the Software Factory. Check the latest tag on GitHub and increment it (e.g., from `v0.1.0-beta.4` to `v0.1.0-beta.5`).
```bash
git tag v0.1.0-beta.X
```

## 3. Push the Tag
This starts the automated build process on GitHub's servers (Windows, macOS, Linux).
```bash
git push origin v0.1.0-beta.X
```

## 4. Publish the Release
1. Go to your GitHub Repository -> **Actions** tab.
2. Wait for the builds to finish (approx. 10-15 minutes).
3. Go to the **Releases** section.
4. Open the "Draft" release created by the build.
5. Review the assets, add any release notes, and click **Publish Release**.

*The links in your `README.md` will automatically update to point to these new installers once published.*
