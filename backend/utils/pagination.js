const PAGINATION_CONSTANTS = {
  PAGE_PARAM: "page",
  LIMIT_PARAM: "limit",
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

/**
 * Sanitize pagination params.
 * @param {string|number} page - The requested page number.
 * @param {string|number} limit - The number of items per page.
 * @returns {Object} - Sanitized page and limit.
 */
function sanitizePaginationParams(page, limit) {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);

  return {
    page: isNaN(parsedPage) || parsedPage < 1 ? PAGINATION_CONSTANTS.DEFAULT_PAGE : parsedPage,
    limit: isNaN(parsedLimit) || parsedLimit < 1 ? PAGINATION_CONSTANTS.DEFAULT_LIMIT : Math.min(parsedLimit, PAGINATION_CONSTANTS.MAX_LIMIT),
  };
}

/**
 * Generate HATEOAS pagination links.
 * @param {number} page - Current page number.
 * @param {number} limit - Items per page.
 * @param {number} totalItems - Total number of items.
 * @param {string} baseUrl - Base URL for the endpoint.
 * @returns {Array} - Array of HATEOAS links.
 */
function generatePaginationLinks(page, limit, totalItems, baseUrl) {
  const totalPages = Math.ceil(totalItems / limit);
  const makeLink = (p) =>
    `${baseUrl}?${PAGINATION_CONSTANTS.PAGE_PARAM}=${p}&${PAGINATION_CONSTANTS.LIMIT_PARAM}=${limit}`;

  return [
    { rel: "first", href: makeLink(1) },
    { rel: "prev", href: page > 1 ? makeLink(page - 1) : null },
    { rel: "self", href: makeLink(page) },
    { rel: "next", href: page < totalPages ? makeLink(page + 1) : null },
    { rel: "last", href: makeLink(totalPages) },
  ].filter((link) => link.href !== null);
}

export { PAGINATION_CONSTANTS, sanitizePaginationParams, generatePaginationLinks };
