class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const fail = (status, code, message) => { throw new HttpError(status, code, message); };
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Malformed JSON body' } });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Request body is too large' } });
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: { code: 'DUPLICATE', message: 'A unique value already exists' } });
  console.error('Internal request error:', err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}

module.exports = { HttpError, fail, wrap, errorHandler };
