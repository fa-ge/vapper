const webpackConfig = require('@vapper/webpack-config')
const Service = require('@vue/cli-service')

module.exports = class Configer {
  constructor (api) {
    const { options } = api

    this.api = api
    this.mode = options.vueCliMode || options.mode
    this.service = new Service(process.cwd())
    this.service.init(this.mode)

    this.service.webpackChainFns.push(this.baseChainFn.bind(this))
    // Apply user-defined webpack chain functions
    this.service.webpackChainFns.push(...api.webpackChainFns)

    this.serverChainFn = this.serverChainFn.bind(this)
    this.clientChainFn = this.clientChainFn.bind(this)
  }

  getServerConfig () {
    this.addFn(this.serverChainFn)
    const config = this.service.resolveWebpackConfig()
    this.removeFn(this.serverChainFn)
    return config
  }

  getClientConfig () {
    this.addFn(this.clientChainFn)
    const config = this.service.resolveWebpackConfig()
    this.removeFn(this.clientChainFn)
    return config
  }

  addFn (fn) {
    this.service.webpackChainFns.push(fn)
  }

  removeFn (fn) {
    this.service.webpackChainFns.splice(
      this.service.webpackChainFns.indexOf(fn),
      1
    )
  }

  baseChainFn (config) {
    webpackConfig.base(this.api, config)

    config
      .plugin('PrintStatusPlugin')
      .use(require('./PrintStatusPlugin'), [
        {
          printFileStats: true,
          logger: this.api.logger
        }
      ])

    // Removed cache-loader to avoid accidental Flash of Unstyled Content
    // in the development environment.
    config.module.rule('vue').uses.delete('cache-loader')

    config
      .plugin('define')
      .tap(args => {
        args[0]['process.env']['VAPPER_TARGET'] = JSON.stringify(process.env.VAPPER_TARGET)
        args[0]['process.env']['VAPPER_ENV'] = JSON.stringify(process.env.VAPPER_ENV)
        args[0]['process.server'] = process.env.VAPPER_TARGET === 'server'
        args[0]['process.browser'] = process.env.VAPPER_TARGET === 'client'
        args[0]['process.client'] = process.env.VAPPER_TARGET === 'client'

        for (const key in this.api.ENV_OBJECT) {
          args[0]['process.env'][key] = JSON.stringify(this.api.ENV_OBJECT[key])
        }

        return args
      })

    // Should transpile vapper related code
    const originJsRuleFn = Array.from(
      config.module
        .rule('js')
        .test(/\.m?jsx?$/)
        .exclude
        .store
    )[0]
    config.module
      .rule('js')
      .test(/\.m?jsx?$/)
      .exclude
      .clear()
      .add(filepath => {
        if (/@vapper/.test(filepath)) return false
        if (!originJsRuleFn) return false
        return originJsRuleFn(filepath)
      })

    config
      .plugin('friendly-errors')
      .init((Plugin, args) => new Plugin({ ...args, clearConsole: false }))
  }

  serverChainFn (config) {
    webpackConfig.server(this.api, config)

    config
      .entryPoints
      .delete('index')

    config
      .entry('app')
      .clear()
      .add(this.api.resolveCore('app/serverEntry.js'))
  }

  clientChainFn (config) {
    webpackConfig.client(this.api, config)

    config
      .entryPoints
      .delete('index')

    config
      .entry('app')
      .clear()
      .when(!this.api.isProd, entry => entry.add(require.resolve('webpack-hot-middleware/client')))
      .add(this.api.resolveCore('app/clientEntry.js'))
  }
}
