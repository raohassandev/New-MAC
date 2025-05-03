# GitHub Push Troubleshooting Guide

We're experiencing permission issues when trying to push to your GitHub repository. Here are three approaches you can try:

## Option 1: Fix Repository Permissions

1. Go to your GitHub repository at https://github.com/raohassandev/New-MAC
2. Click on "Settings" (tab at the top)
3. Select "Collaborators and teams" from the left menu
4. Make sure your GitHub user account (either israrulhaq or raohassandev) is listed with write access
5. If not, add yourself as a collaborator with write permission

## Option 2: Create a New Personal Access Token

1. Go to GitHub.com and log in
2. Click on your profile icon in the top-right corner
3. Select "Settings"
4. Scroll down and click on "Developer settings" (at the bottom of the left sidebar)
5. Click on "Personal access tokens" → "Tokens (classic)"
6. Click "Generate new token" → "Generate new token (classic)"
7. Give it a descriptive name like "MAC Repository Access"
8. Set an expiration date
9. Under "Select scopes", check all the boxes under "repo"
10. Click "Generate token"
11. Copy the token immediately (you won't be able to see it again)
12. Update your git remote:
   ```bash
   git remote set-url origin https://YOUR_USERNAME:YOUR_NEW_TOKEN@github.com/raohassandev/New-MAC.git
   ```
13. Try pushing again:
   ```bash
   git push -u origin main
   ```

## Option 3: Use SSH Authentication (Most Reliable)

1. Generate a new SSH key:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```
2. Start the SSH agent:
   ```bash
   eval "$(ssh-agent -s)"
   ```
3. Add your SSH key to the agent:
   ```bash
   ssh-add ~/.ssh/id_ed25519
   ```
4. Copy your public key:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
5. Add the SSH key to your GitHub account:
   - Go to GitHub.com → Settings → SSH and GPG keys
   - Click "New SSH key"
   - Paste your public key and give it a title
   - Click "Add SSH key"
6. Change your git remote to use SSH:
   ```bash
   git remote set-url origin git@github.com:raohassandev/New-MAC.git
   ```
7. Try pushing again:
   ```bash
   git push -u origin main
   ```

## Option 4: Clone Directly From GitHub

If none of the above methods work, you can:

1. Download your current code as a ZIP file:
   ```bash
   cd /Users/israrulhaq/Desktop
   zip -r MAC_backup.zip MAC
   ```
2. Clone the repository directly from GitHub:
   ```bash
   cd /Users/israrulhaq/Desktop
   mv MAC MAC_old
   git clone https://github.com/raohassandev/New-MAC.git MAC
   ```
3. Copy your changes to the new repository:
   ```bash
   cp -r MAC_old/* MAC/
   cd MAC
   git add .
   git commit -m "Add device structure improvements"
   git push
   ```

This approach should bypass any permissions issues by starting with a fresh clone from GitHub.