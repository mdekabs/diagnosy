/**
 * @constant {Object} PAGINATION_CONSTANTS
 * @property {string} PAGE_PARAM - Query parameter for page number
 * @property {string} LIMIT_PARAM - Query parameter for items per page
 * @property {number} DEFAULT_PAGE - Default page number
 * @property {number} DEFAULT_LIMIT - Default items per page
 * @property {number} MAX_LIMIT - Maximum allowed items per page
 */
export const PAGINATION_CONSTANTS = {
  PAGE_PARAM: 'page',
  LIMIT_PARAM: 'limit',
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

/**
 * Sanitizes pagination parameters with defaults and constraints
 * @param {string|number} page - Requested page number
 * @param {string|number} limit - Requested items per page
 * @returns {{page: number, limit: number}} Sanitized pagination parameters
 */
export const sanitizePaginationParams = (page, limit) => {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);

  return {
    page: isNaN(parsedPage) || parsedPage < 1 ? PAGINATION_CONSTANTS.DEFAULT_PAGE : parsedPage,
    limit: isNaN(parsedLimit) || parsedLimit < 1 ? PAGINATION_CONSTANTS.DEFAULT_LIMIT : Math.min(parsedLimit, PAGINATION_CONSTANTS.MAX_LIMIT),
  };
};

/**
 * Generates HATEOAS pagination links
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} totalItems - Total number of items
 * @param {string} baseUrl - Base URL for the endpoint
 * @returns {{self: string, first: string, prev?: string, next?: string, last: string}} HATEOAS links
 */
export const generatePaginationLinks = (page, limit, totalItems, baseUrl) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const makeLink = (p) => `${baseUrl}?${PAGINATION_CONSTANTS.PAGE_PARAM}=${p}&${PAGINATION_CONSTANTS.LIMIT_PARAM}=${limit}`;

  const links = {
    self: makeLink(page),
    first: makeLink(1),
    last: makeLink(totalPages),
  };
  if (page > 1) links.prev = makeLink(page - 1);
  if (page < totalPages) links.next = makeLink(page + 1);

  return links;
};
