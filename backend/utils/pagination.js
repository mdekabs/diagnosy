import { Chat } from '../models/chat.js';

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

/**
 * Retrieves paginated chat history
 * @async
 * @param {Object} match - MongoDB match criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<{history: Array, totalItems: number, totalPages: number}>} Paginated history data
 */
export const getPaginatedHistory = async (match, page, limit) => {
  const chat = await Chat.findOne(match).exec();
  const totalItems = chat?.history.length ?? 0;

  const pipeline = [
    { $match: match },
    { $unwind: '$history' },
    { $sort: { 'history.timestamp': -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    { $project: { role: '$history.role', content: '$history.content', timestamp: '$history.timestamp' } },
  ];

  const paginatedHistory = await Chat.aggregate(pipeline).option({ getters: true });
  const history = paginatedHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
  }));

  return { history, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)) };
};
