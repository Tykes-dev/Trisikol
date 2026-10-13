# GitHub workflow

Repository: https://github.com/Tykes-dev/Trisikol

The first `main` commit is a development snapshot, not a release. Git tracks
source history; it does not host or start the backend or database.

## What was configured

- `git init -b main`: starts local version control with the branch named main.
- `git remote add origin <repository-url>`: names your GitHub repository origin.
- Repository-local `user.name` and GitHub no-reply `user.email`: label commits
  without changing other projects or publishing a personal email address.
- `git add`: selects file contents for the next commit. It does not upload them.
- `git commit`: saves a local snapshot of the staged contents.
- `git push -u origin main`: uploads main and remembers its upstream branch.

Git is installed on the computer. Git Bash is optional; PowerShell and VS Code's
terminal can run these commands. This folder already contains the working project,
so do not clone another copy over it or initialize it again.

## Continue a module

From the workspace root, start a branch before further implementation:

```powershell
git status
git switch -c feature/trip-validation
```

After editing and testing, stage only the files for that module. For example:

```powershell
git add trisikol-web/src/pages/PassengerHome.jsx
git diff --cached --stat
git diff --cached
```

The last command shows exactly what the commit will contain. Check for passwords,
keys, personal records and accidental files before committing. Then:

```powershell
git commit -m "fix: validate passenger booking state"
git push -u origin feature/trip-validation
```

Use a message describing what actually changed and list only tests you ran.
On GitHub, open a pull request comparing the feature branch with main. Pushing a
feature branch or opening a pull request does not change main; merging does.

## Secrets and local data

Real environment files, H2 databases, backups, private keys, generated output,
local tool settings and historical business documents/generators are ignored.
Only blank or public `.env.example` values are included. Test-only passwords in
automated tests are not live account credentials.

`.gitignore` cannot protect a secret pasted into a tracked source file. Recheck
staged contents for every commit. Never use `git add -f` to include secrets. If a
live key is ever published, revoke/rotate it; deleting the current file alone
does not remove it from earlier history.
