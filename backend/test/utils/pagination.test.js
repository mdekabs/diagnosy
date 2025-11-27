import { expect } from 'chai';
import {
  sanitizePaginationParams,
  generatePaginationLinks,
  PAGINATION_CONSTANTS,
} from '../../utils/pagination.js';

describe('Pagination Utilities', () => {
  describe('sanitizePaginationParams()', () => {
    it('should return default values when inputs are invalid', () => {
      const result = sanitizePaginationParams('abc', null);

      expect(result.page).to.equal(PAGINATION_CONSTANTS.DEFAULT_PAGE);
      expect(result.limit).to.equal(PAGINATION_CONSTANTS.DEFAULT_LIMIT);
    });

    it('should return parsed values when inputs are valid', () => {
      const result = sanitizePaginationParams('3', '15');

      expect(result.page).to.equal(3);
      expect(result.limit).to.equal(15);
    });

    it('should not allow page numbers less than 1', () => {
      const result = sanitizePaginationParams('0', '20');

      expect(result.page).to.equal(PAGINATION_CONSTANTS.DEFAULT_PAGE);
    });

    it('should enforce max limit constraint', () => {
      const result = sanitizePaginationParams('2', '500');

      expect(result.limit).to.equal(PAGINATION_CONSTANTS.MAX_LIMIT);
    });
  });

  describe('generatePaginationLinks()', () => {
    it('should generate correct basic links', () => {
      const links = generatePaginationLinks(1, 10, 50, '/api/items');

      expect(links.self).to.equal('/api/items?page=1&limit=10');
      expect(links.first).to.equal('/api/items?page=1&limit=10');
      expect(links.last).to.equal('/api/items?page=5&limit=10');
    });

    it('should include next link when not on last page', () => {
      const links = generatePaginationLinks(2, 10, 100, '/api/items');

      expect(links.next).to.equal('/api/items?page=3&limit=10');
    });

    it('should include prev link when not on first page', () => {
      const links = generatePaginationLinks(3, 10, 100, '/api/items');

      expect(links.prev).to.equal('/api/items?page=2&limit=10');
    });

    it('should not include prev on first page', () => {
      const links = generatePaginationLinks(1, 10, 30, '/api/items');

      expect(links.prev).to.be.undefined;
    });

    it('should not include next on last page', () => {
      const links = generatePaginationLinks(3, 10, 30, '/api/items');

      expect(links.next).to.be.undefined;
    });
  });
});
