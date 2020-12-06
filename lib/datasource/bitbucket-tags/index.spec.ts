import { getPkgReleases } from '..';
import * as httpMock from '../../../test/httpMock';
import { id as datasource } from '.';

describe('datasource/bitbucket-tags', () => {
  beforeEach(() => {
    httpMock.reset();
    httpMock.setup();
  });
  describe('getReleases', () => {
    it('returns tags from bitbucket cloud', async () => {
      const body = {
        pagelen: 3,
        values: [
          {
            name: 'v1.0.0',
            target: {
              date: '2020-11-19T09:05:35+00:00',
            },
          },
          {
            name: 'v1.1.0',
            target: {},
          },
          {
            name: 'v1.1.1',
          },
        ],
        page: 1,
      };
      httpMock
        .scope('https://api.bitbucket.org')
        .get('/2.0/repositories/some/dep2/refs/tags')
        .reply(200, body);
      const res = await getPkgReleases({
        datasource,
        depName: 'some/dep2',
      });
      expect(res).toMatchSnapshot();
      expect(res.releases).toHaveLength(3);
      expect(httpMock.getTrace()).toMatchSnapshot();
    });
  });
});
