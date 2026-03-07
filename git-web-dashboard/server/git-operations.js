// ══════════════════════════════════════════════════════════════════════════════
// Git Operations — simple-git wrapper
// ══════════════════════════════════════════════════════════════════════════════

const simpleGit = require('simple-git');
const path = require('path');

const REPO_PATH = process.env.REPO_PATH || path.resolve(__dirname, '../../..');
const git = simpleGit(REPO_PATH);

module.exports = {
  // Get repository status
  async getStatus() {
    const status = await git.status();
    const branch = await git.branchLocal();
    
    return {
      current: status.current,
      tracking: status.tracking,
      ahead: status.ahead,
      behind: status.behind,
      modified: status.modified,
      created: status.created,
      deleted: status.deleted,
      renamed: status.renamed,
      conflicted: status.conflicted,
      staged: status.staged,
      not_added: status.not_added,
      branches: branch.all,
      currentBranch: branch.current
    };
  },

  // Get commit history
  async getCommits(limit = 50) {
    const log = await git.log({ maxCount: limit });
    
    return log.all.map(commit => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.author_name,
      email: commit.author_email,
      date: commit.date,
      refs: commit.refs
    }));
  },

  // Get branches
  async getBranches() {
    const local = await git.branchLocal();
    const remote = await git.branch(['-r']);
    
    return {
      current: local.current,
      local: local.all,
      remote: remote.all
    };
  },

  // Get diff for a file
  async getDiff(file = null) {
    if (file) {
      return await git.diff([file]);
    }
    return await git.diff();
  },

  // Pull changes
  async pull() {
    try {
      const result = await git.pull('origin', 'main', { '--rebase': 'true' });
      return {
        success: true,
        summary: result.summary,
        files: result.files
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Push changes
  async push() {
    try {
      const result = await git.push('origin', 'main');
      return {
        success: true,
        pushed: result.pushed
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Commit changes
  async commit(message) {
    try {
      await git.add('.');
      const result = await git.commit(message);
      return {
        success: true,
        commit: result.commit,
        summary: result.summary
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Switch branch
  async switchBranch(branch) {
    try {
      await git.checkout(branch);
      return {
        success: true,
        current: branch
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Create branch
  async createBranch(name) {
    try {
      await git.checkoutLocalBranch(name);
      return {
        success: true,
        branch: name
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Delete branch
  async deleteBranch(name) {
    try {
      await git.deleteLocalBranch(name);
      return {
        success: true,
        deleted: name
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};
