const path = require('path')
const finalhandler = require('finalhandler')
const serveStatic = require('serve-static')

module.exports = (api) => {
  return (req, res, next) => {
    const originalUrl = req.url

    // Serve pre-rendered html file
    const { generate } = api.options
    if (
      api.isProd &&
      generate &&
      generate.routes &&
      generate.routes.length &&
      generate.routes.includes(originalUrl)
    ) {
      req.url = api.urlToFileName(originalUrl)
    }

    // FIX: Treat URLs with extensions as requests for static resources?
    const hasExt = path.extname(req.url)
    if (hasExt) {
      req.url = req.url.replace(/^\/_homo_/, '')

      api.logger.debug(`
        proxy: ${originalUrl}
        to: ${req.url}
      `)

      api.isProd
        ? serveStatic('dist', api.options.static)(req, res, finalhandler(req, res))
        : serveStatic('public', api.options.static)(req, res, finalhandler(req, res))

      return
    }

    next()
  }
}
