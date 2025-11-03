import { logger } from "../config/index.js";
import { responseHandler } from "../utils/index.js";
import HttpStatus from "http-status-codes";

const PAGINATION_CONSTANTS = {
  PAGE_PARAM: "page",
  LIMIT_PARAM: "limit",
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

/**
 * Generate HATEOAS pagination links.
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
    { rel: "last", href: makeLink(totalPages) }, // <-- FIX: Removed redundant 'rel:'
  ].filter((link) => link.href !== null);
}

/**
 * Sanitize pagination params.
 */
function sanitizePaginationParams(page, limit) {
  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);

  return {
    page:
      isNaN(parsedPage) || parsedPage < 1
        ? PAGINATION_CONSTANTS.DEFAULT_PAGE
        : parsedPage,
    limit:
      isNaN(parsedLimit) || parsedLimit < 1
        ? PAGINATION_CONSTANTS.DEFAULT_LIMIT
        : Math.min(parsedLimit, PAGINATION_CONSTANTS.MAX_LIMIT),
  };
}

/**
 * Middleware that automatically applies pagination to any JSON response
 * that includes an array (either at top-level `data`, `history`, or inside `data.history`).
 */
export const pagination = (req, res, next) => {
  try {
    const { page, limit } = sanitizePaginationParams(
      req.query[PAGINATION_CONSTANTS.PAGE_PARAM],
      req.query[PAGINATION_CONSTANTS.LIMIT_PARAM]
    );

    const baseUrl = `${req.protocol}://${req.get("host")}${req.originalUrl.split("?")[0]}`;

    // Override res.json to inject pagination before sending
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        
        let arrayToPaginate = null;
        let path = "";

        // Detect which array to paginate
        if (Array.isArray(body.data)) {
          arrayToPaginate = body.data;
          path = "data";
        } else if (Array.isArray(body.history)) { // Check for Top-level history array
          arrayToPaginate = body.history;
          path = "history";
        } else if (Array.isArray(body.data?.history)) {
          arrayToPaginate = body.data.history;
          path = "data.history";
        }

        // If no array was found, return the original body
        if (!arrayToPaginate) return originalJson(body);

        const totalItems = arrayToPaginate.length;
        const totalPages = Math.ceil(totalItems / limit);
        const start = (page - 1) * limit;
        const paginatedItems = arrayToPaginate.slice(start, start + limit);

        // Replace with paginated subset
        if (path === "data") body.data = paginatedItems;
        else if (path === "history") body.history = paginatedItems; 
        else if (path === "data.history") body.data.history = paginatedItems;

        // Attach pagination meta
        body.pagination = {
          totalItems,
          totalPages,
          currentPage: page,
          limit,
          links: generatePaginationLinks(page, limit, totalItems, baseUrl),
        };
      } catch (err) {
        logger.error(`Pagination injection error: ${err.message}`);
      }

      return originalJson(body);
    };

    next();
  } catch (error) {
    logger.error(`Pagination Middleware Error: ${error.message}`);
    return responseHandler(
      res,
      HttpStatus.INTERNAL_SERVER_ERROR,
      "error",
      "Internal server error"
    );
  }
};
