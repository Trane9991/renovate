import { RenovateConfig, RepoAdminConfig } from './common';

let adminConfig: RepoAdminConfig = {};

// TODO: once admin config work is complete, add a test to make sure this list includes all options with admin=true
export const repoAdminOptions = [
  'allowPostUpgradeCommandTemplating',
  'allowedPostUpgradeCommands',
  'dockerImagePrefix',
  'dockerUser',
  'trustLevel',
];

export function setAdminConfig(config: RenovateConfig = {}): void {
  adminConfig = {};
  for (const option of repoAdminOptions) {
    adminConfig[option] = config[option];
    delete config[option]; // eslint-disable-line no-param-reassign
  }
}

export function getAdminConfig(): RepoAdminConfig {
  return adminConfig;
}
