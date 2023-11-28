import httpStatus from "http";
/**
 * Handle Response sent to user.
 * @param {Object} res - response object
 * @parm {Numbeer} code = Http Status code
 * @parm {String} mes = the message to send
 * @returns {object} the json response
 */

export function HandleResponse(res, code, mes) {
  return res.status(code).json({ message: mes });
}
