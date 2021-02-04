import * as utils from '../../platform/bitbucket/utils';
import * as packageCache from '../../util/cache/package';
import { BitbucketHttp } from '../../util/http/bitbucket';
import { ensureTrailingSlash } from '../../util/url';
import { DigestConfig, GetReleasesConfig, ReleaseResult } from '../common';

const bitbucketHttp = new BitbucketHttp();

export const id = 'bitbucket-tags';
export const registryStrategy = 'first';
export const defaultRegistryUrls = ['https://bitbucket.org'];

function getRegistryURL(registryUrl: string): string {
  // fallback to default API endpoint if custom not provided
  return registryUrl ?? defaultRegistryUrls[0];
}

const cacheNamespace = 'datasource-bitbucket';

function getCacheKey(registryUrl: string, repo: string, type: string): string {
  return `${getRegistryURL(registryUrl)}:${repo}:${type}`;
}

type BitbucketTag = {
  name: string;
  target?: {
    date?: string;
    hash: string;
  };
};

// getReleases fetches list of tags for the repository
export async function getReleases({
  registryUrl,
  lookupName: repo,
}: GetReleasesConfig): Promise<ReleaseResult | null> {
  const type = 'tags';
  const cachedResult = await packageCache.get<ReleaseResult>(
    cacheNamespace,
    getCacheKey(registryUrl, repo, type)
  );
  // istanbul ignore if
  if (cachedResult) {
    return cachedResult;
  }

  const url = `/2.0/repositories/${repo}/refs/tags`;

  const bitbucketTags = (
    await bitbucketHttp.getJson<utils.PagedResult<BitbucketTag>>(url)
  ).body;

  const dependency: ReleaseResult = {
    sourceUrl: `${ensureTrailingSlash(getRegistryURL(registryUrl))}${repo}`,
    releases: null,
  };
  dependency.releases = bitbucketTags.values.map(({ name, target }) => ({
    version: name,
    gitRef: name,
    releaseTimestamp: target?.date,
  }));

  const cacheMinutes = 10;
  await packageCache.set(
    cacheNamespace,
    getCacheKey(registryUrl, repo, type),
    dependency,
    cacheMinutes
  );
  return dependency;
}

type BitbucketCommit = {
  hash: string;
  date?: string;
};

// getTagCommit fetched the commit has for specified tag
async function getTagCommit(
  registryUrl: string,
  repo: string,
  tag: string
): Promise<string | null> {
  const type = `tag-${tag}`;
  const cachedResult = await packageCache.get<string>(
    cacheNamespace,
    getCacheKey(registryUrl, repo, type)
  );
  // istanbul ignore if
  if (cachedResult) {
    return cachedResult;
  }

  const url = `/2.0/repositories/${repo}/refs/tags/${tag}`;

  const bitbucketTag = (await bitbucketHttp.getJson<BitbucketTag>(url)).body;

  const hash = bitbucketTag.target.hash;

  const cacheMinutes = 10;
  await packageCache.set(
    cacheNamespace,
    getCacheKey(registryUrl, repo, type),
    hash,
    cacheMinutes
  );

  return hash;
}

// getDigest fetched the latest commit for repository main branch
// however, if newValue is provided, then getTagCommit is called
export async function getDigest(
  { lookupName: repo, registryUrl }: Partial<DigestConfig>,
  newValue?: string
): Promise<string | null> {
  if (newValue?.length) {
    return getTagCommit(registryUrl, repo, newValue);
  }

  const type = 'digest';
  const cachedResult = await packageCache.get<string>(
    cacheNamespace,
    getCacheKey(registryUrl, repo, type)
  );
  // istanbul ignore if
  if (cachedResult) {
    return cachedResult;
  }

  const mainBranch =
    (
      await bitbucketHttp.getJson<utils.RepoInfoBody>(
        `/2.0/repositories/${repo}`
      )
    ).body.mainbranch.name ?? '';

  const url = `/2.0/repositories/${repo}/commits/${mainBranch}`;

  const bitbucketCommits = (
    await bitbucketHttp.getJson<utils.PagedResult<BitbucketCommit>>(url)
  ).body;

  if (bitbucketCommits.values.length === 0) {
    return null;
  }

  const latestCommit = bitbucketCommits.values[0].hash;

  const cacheMinutes = 10;
  await packageCache.set(
    cacheNamespace,
    getCacheKey(registryUrl, repo, type),
    latestCommit,
    cacheMinutes
  );

  return latestCommit;
}
