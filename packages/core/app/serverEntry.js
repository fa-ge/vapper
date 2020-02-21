import Vue from 'vue'
import { serverPlugin } from './prefetcher'
import createAppAPI from './createApp'
import { createServerRedirect } from './redirect'
import VapperError from './VapperError'

// Dynamically generated by vapper
import enhanceApp from './.vapper/enhanceServer'

// Avoid multiple installations in development mode
const alreadyInstalled = Vue._installedPlugins && Vue._installedPlugins.some(p => {
  return typeof p === 'function' && p.__name === 'vapperServerPlugin'
})
if (!alreadyInstalled) Vue.use(serverPlugin)

const TYPE = 'server'

export default async context => {
  const isFake = context.fake
  Object.assign(context, {
    pluginRuntimeOptions: createAppAPI.pluginRuntimeOptions,
    type: TYPE,
    isFake,
    rootOptions: {}
  })

  enhanceApp(context)

  const rootOptions = createAppAPI(context)
  const { router, store, apolloProvider } = rootOptions

  // This is a fake rendering in the `setup` to get the router instance
  if (isFake) {
    throw new VapperError({
      code: 'FAKE',
      router
    })
  }

  // This Vue instance for custom error pages
  if (context.renderError) {
    if (rootOptions.ErrorComponent) {
      const app = new Vue({
        render (h) {
          return h(rootOptions.ErrorComponent, { props: { error: context.renderError } })
        }
      })
      context.meta = app.$meta()
      return app
    } else {
      throw context.renderError
    }
  }

  // Add helpers
  router.$$redirect = createServerRedirect(context.res)
  router.$$type = TYPE

  if (router.options.base) {
    context.url = getLocation(router.options.base, context.url)
  }

  await router.push(context.url)

  const app = new Vue(rootOptions)
  app.initialState = rootOptions.initialState
  // Add helpers
  app.$$redirect = router.$$redirect
  app.$$type = TYPE

  // Waiting for the route to be ready
  await routerReady(router)

  const matchedComponents = router.getMatchedComponents()
  // no matched routes, reject with 404
  if (!matchedComponents.length) {
    throw new VapperError({
      url: context.url,
      code: 404,
      message: 'Page Not Found'
    })
  }
  context.rendered = () => {
    // The data will be serialized
    context.state = {
      $$store: store ? store.state : undefined,
      // vue-ssr-prefetcher
      $$selfStore: app.$$selfStore,
      ...(rootOptions.initialState || {})
    }
    if (apolloProvider) {
      // Also inject the apollo cache state
      context.state.$$apolloState = getApolloStates(apolloProvider)
    }
  }
  // vue-meta
  context.meta = app.$meta()
  return app
}

async function routerReady (router) {
  return new Promise((resolve, reject) => {
    router.onReady(resolve, reject)
  })
}

function getApolloStates (apolloProvider, options = {}) {
  const finalOptions = Object.assign({}, {
    exportNamespace: ''
  }, options)
  const states = {}
  for (const key in apolloProvider.clients) {
    const client = apolloProvider.clients[key]
    const state = client.cache.extract()
    states[`${finalOptions.exportNamespace}${key}`] = state
  }
  return states
}

function getLocation (base, url) {
  let path = decodeURI(url)
  base = base.replace(/\/$/, '')
  if (base && path.indexOf(base) === 0) {
    path = path.slice(base.length)
  }
  return path[0] === '/' ? path : '/' + path
}
