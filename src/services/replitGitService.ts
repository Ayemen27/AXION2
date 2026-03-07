/**
 * Replit-Style Git Service
 * Auto Change Detection for Project Files
 */

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  localContent?: string;
  remoteContent?: string;
  localSha?: string;
  remoteSha?: string;
}

export interface ChangeDetectionResult {
  changes: FileChange[];
  totalAdded: number;
  totalModified: number;
  totalDeleted: number;
  hasChanges: boolean;
}

export class ReplitGitService {
  /**
   * Fetch latest files from GitHub repository
   * ⚠️ This does NOT detect local changes - web browsers cannot access local files!
   * Instead, it fetches the latest commit's files for user to edit and push
   */
  async detectChanges(
    repository: string,
    branch: string,
    githubToken: string
  ): Promise<ChangeDetectionResult> {
    // ⚠️ WEB LIMITATION: We cannot detect actual local changes
    // Instead, return empty - let autoSyncChanges handle fetching from GitHub
    return {
      changes: [],
      totalAdded: 0,
      totalModified: 0,
      totalDeleted: 0,
      hasChanges: false,
    };
  }

  /**
   * Get all local project files
   * ⚠️ WEB BROWSER LIMITATION: Cannot access local file system
   * This function is intentionally left empty as web apps cannot read local files
   * Users must manually select/upload files or we fetch from GitHub directly
   */
  private async getLocalProjectFiles(): Promise<Map<string, string>> {
    // Browser security prevents file system access
    // Users must use file input or we fetch from GitHub
    return new Map<string, string>();
  }

  /**
   * Calculate SHA-1 hash for content (Git blob SHA)
   */
  private async calculateSHA(content: string): Promise<string> {
    // Git SHA-1 format: sha1("blob " + filesize + "\0" + content)
    const blob = `blob ${new TextEncoder().encode(content).length}\0${content}`;
    const msgBuffer = new TextEncoder().encode(blob);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Fetch file content from GitHub
   */
  private async fetchRemoteFileContent(
    owner: string,
    repo: string,
    path: string,
    branch: string,
    githubToken: string
  ): Promise<string> {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${path}`);
    }

    const fileData = await response.json();
    return atob(fileData.content.replace(/\n/g, ''));
  }

  /**
   * Stage files for commit (prepare for push)
   */
  async stageFiles(changes: FileChange[]): Promise<Array<{ path: string; content: string }>> {
    return changes
      .filter(c => c.status !== 'deleted')
      .map(c => ({
        path: c.path,
        content: c.localContent || '',
      }));
  }

  /**
   * Calculate diff between two file contents
   */
  calculateDiff(oldContent: string, newContent: string): {
    additions: number;
    deletions: number;
    diff: string;
  } {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    let additions = 0;
    let deletions = 0;
    const diffLines: string[] = [];

    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine === undefined) {
        additions++;
        diffLines.push(`+ ${newLine}`);
      } else if (newLine === undefined) {
        deletions++;
        diffLines.push(`- ${oldLine}`);
      } else if (oldLine !== newLine) {
        deletions++;
        additions++;
        diffLines.push(`- ${oldLine}`);
        diffLines.push(`+ ${newLine}`);
      }
    }

    return {
      additions,
      deletions,
      diff: diffLines.join('\n'),
    };
  }
}

export const replitGitService = new ReplitGitService();
