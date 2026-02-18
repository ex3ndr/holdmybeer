export interface GitHubRepoRef {
  owner: string;
  repo: string;
  fullName: string;
  url: string;
}

export type GitHubRepoStatus = "missing" | "empty" | "nonEmpty";
