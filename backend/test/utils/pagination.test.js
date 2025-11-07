// test/pagination.test.js
import { expect } from 'chai';
import {
  PAGINATION_CONSTANTS,
  sanitizePaginationParams,
  generatePaginationLinks,
} from '../../utils/pagination.js';

describe('Pagination Utilities', () => {
  describe('sanitizePaginationParams', () => {
    it('should return default values for undefined inputs', () => {
      const result = sanitizePaginationParams(undefined, undefined);
      expect(result).to.deep.equal({
        page: PAGINATION_CONSTANTS.DEFAULT_PAGE, // 1
        limit: PAGINATION_CONSTANTS.DEFAULT_LIMIT, // 10
      });
    });

    it('should return default values for non-numeric inputs', () => {
      const result = sanitizePaginationParams('abc', 'xyz');
      expect(result).to.deep.equal({
        page: PAGINATION_CONSTANTS.DEFAULT_PAGE, // 1
        limit: PAGINATION_CONSTANTS.DEFAULT_LIMIT, // 10
      });
    });

    it('should return default values for negative or zero inputs', () => {
      const result = sanitizePaginationParams(-1, 0);
      expect(result).to.deep.equal({
        page: PAGINATION_CONSTANTS.DEFAULT_PAGE, // 1
        limit: PAGINATION_CONSTANTS.DEFAULT_LIMIT, // 10
      });
    });

    it('should parse valid numeric strings', () => {
      const result = sanitizePaginationParams('2', '20');
      expect(result).to.deep.equal({
        page: 2,
        limit: 20,
      });
    });

    it('should parse valid numbers', () => {
      const result = sanitizePaginationParams(3, 30);
      expect(result).to.deep.equal({
        page: 3,
        limit: 30,
      });
    });

    it('should cap limit at MAX_LIMIT', () => {
      const result = sanitizePaginationParams(1, 150);
      expect(result).to.deep.equal({
        page: 1,
        limit: PAGINATION_CONSTANTS.MAX_LIMIT, // 100
      });
    });
  });

  describe('generatePaginationLinks', () => {
    const baseUrl = 'http://example.com/api/resource';

    it('should generate all links for a middle page', () => {
      const result = generatePaginationLinks(2, 5, 20, baseUrl);
      expect(result).to.deep.equal([
        { rel: 'first', href: `${baseUrl}?page=1&limit=5` },
        { rel: 'prev', href: `${baseUrl}?page=1&limit=5` },
        { rel: 'self', href: `${baseUrl}?page=2&limit=5` },
        { rel: 'next', href: `${baseUrl}?page=3&limit=5` },
        { rel: 'last', href: `${baseUrl}?page=4&limit=5` },
      ]);
    });

    it('should omit prev link for first page', () => {
      const result = generatePaginationLinks(1, 5, 20, baseUrl);
      expect(result).to.deep.equal([
        { rel: 'first', href: `${baseUrl}?page=1&limit=5` },
        { rel: 'self', href: `${baseUrl}?page=1&limit=5` },
        { rel: 'next', href: `${baseUrl}?page=2&limit=5` },
        { rel: 'last', href: `${baseUrl}?page=4&limit=5` },
      ]);
    });

    it('should omit next link for last page', () => {
      const result = generatePaginationLinks(4, 5, 20, baseUrl);
      expect(result).to.deep.equal([
        { rel: 'first', href: `${baseUrl}?page=1&limit=5` },
        { rel: 'prev', href: `${baseUrl}?page=3&limit=5` },
        { rel: 'self', href: `${baseUrl}?page=4&limit=5` },
        { rel: 'last', href: `${baseUrl}?page=4&limit=5` },
      ]);
    });

    it('should handle single page (totalItems <= limit)', () => {
      const result = generatePaginationLinks(1, 10, 5, baseUrl);
      expect(result).to.deep.equal([
        { rel: 'first', href: `${baseUrl}?page=1&limit=10` },
        { rel: 'self', href: `${baseUrl}?page=1&limit=10` },
        { rel: 'last', href: `${baseUrl}?page=1&limit=10` },
      ]);
    });

    it('should handle zero totalItems', () => {
      const result = generatePaginationLinks(1, 10, 0, baseUrl);
      expect(result).to.deep.equal([
        { rel: 'first', href: `${baseUrl}?page=1&limit=10` },
        { rel: 'self', href: `${baseUrl}?page=1&limit=10` },
        { rel: 'last', href: `${baseUrl}?page=1&limit=10` },
      ]);
    });

    it('should generate correct links with different limit', () => {
      const result = generatePaginationLinks(2, 10, 25, baseUrl);
      expect(result).to.deep.equal([
        { rel: 'first', href: `${baseUrl}?page=1&limit=10` },
        { rel: 'prev', href: `${baseUrl}?page=1&limit=10` },
        { rel: 'self', href: `${baseUrl}?page=2&limit=10` },
        { rel: 'next', href: `${baseUrl}?page=3&limit=10` },
        { rel: 'last', href: `${baseUrl}?page=3&limit=10` },
      ]);
    });
  });
});
