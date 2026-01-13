#!/usr/bin/env node
/**
 * Trigger GitHub Actions workflow to publish Windows installer
 * This script uses GitHub CLI to trigger the workflow without requiring local credentials
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if GitHub CLI is installed
function checkGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Trigger the workflow
function triggerWorkflow() {
  try {
    console.log('🚀 Triggering GitHub Actions workflow to publish Windows installer...');
    // Run the workflow against the remote repo directly, so we don't need a local .git repo
    execSync('gh workflow run publish-windows.yml -R Vitco-Impex/desktop-application', {
      stdio: 'inherit',
    });
    console.log('✅ Workflow triggered successfully!');
    console.log('📊 Check the workflow status at: https://github.com/Vitco-Impex/desktop-application/actions');
  } catch (error) {
    console.error('❌ Failed to trigger workflow:', error.message);
    process.exit(1);
  }
}

// Main execution
if (!checkGitHubCLI()) {
  console.error('❌ GitHub CLI (gh) is not installed.');
  console.error('📦 Install it from: https://cli.github.com/');
  console.error('🔐 Then authenticate with: gh auth login');
  process.exit(1);
}

triggerWorkflow();
