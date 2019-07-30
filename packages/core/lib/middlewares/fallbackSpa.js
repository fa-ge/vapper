const serveStatic = require('serve-static')
const finalhandler = require('finalhandler')

module.exports = (api) => {
  return (err, req, res, next) => {
    if (err.code === 'FALLBACK_SPA') {
      api.logger.debug(`Fall back SPA mode, url is: ${req.url}`)
      if (api.isProd) {
        req.url = '/index.html'
        serveStatic('dist', api.options.static)(req, res, finalhandler(req, res))
      } else {
        req.url = '/_homo_/index.html'
        const html = api.devMiddleware.fileSystem.readFileSync(
          api.devMiddleware.getFilenameFromUrl(req.url),
          'utf-8'
        )
        res.setHeader('Content-Type', 'text/html; charset=UTF-8')
        res.end(html)
      }
      return
    }

    next(err)
  }
}
