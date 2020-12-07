import URL from 'url';
import * as utils from '../../platform/bitbucket/utils';
import * as packageCache from '../../util/cache/package';
import { BitbucketHttp, bitbucketApiEndpoint } from '../../util/http/bitbucket';
import { GetReleasesConfig, ReleaseResult } from '../common';

const bitbucketHttp = new BitbucketHttp();

export const id = 'bitbucket-tags';
export const defaultRegistryUrls = [bitbucketApiEndpoint + '2.0/'];
export const registryStrategy = 'first';

const cacheNamespace = 'datasource-bitbucket';
function getCacheKey(depHost: string, repo: string): string {
  const type = 'tags';
  return `${depHost}:${repo}:${type}`;
}

type BitbucketTag = {
  name: string;
  target?: {
    date?: string;
  };
};

export async function getReleases({
  registryUrl: depHost,
  lookupName: repo,
}: GetReleasesConfig): Promise<ReleaseResult | null> {
  const cachedResult = await packageCache.get<ReleaseResult>(
    cacheNamespace,
    getCacheKey(depHost, repo)
  );
  // istanbul ignore if
  if (cachedResult) {
    return cachedResult;
  }

  if (!depHost) {
    depHost = bitbucketApiEndpoint;
  }

  const url = URL.resolve(depHost, `/2.0/repositories/${repo}/refs/tags`);

  const bitbucketTags = (
    await bitbucketHttp.getJson<utils.PagedResult<BitbucketTag>>(url)
  ).body;

  const dependency: ReleaseResult = {
    sourceUrl: URL.resolve(depHost, repo),
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
    getCacheKey(depHost, repo),
    dependency,
    cacheMinutes
  );
  return dependency;
}
