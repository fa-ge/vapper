import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './App.vue'

Vue.config.productionTip = false

Vue.use(VueRouter)

// Export factory function
export default function createApp () {
  // 1. Create a router instance
  const router = new VueRouter({
    mode: 'history',
    routes: [
      {
        path: '/',
        component: () => import('./components/Foo.vue'),
        meta: {
          ssr: true
        }
      },
      {
        path: '/bar',
        name: 'bar',
        component: () => import('./components/Bar.vue'),
        meta: {
          ssr: true
        }
      },
      {
        path: '/baz',
        name: 'baz',
        component: () => import('./components/Baz.vue'),
        meta: {
          ssr: true
        }
      }
    ]
  })

  router.beforeEach((to, from, next) => {
    if (to.path === '/foo') {
      router.$$redirect('/')
      return
    }
    next()
  })

  // 2. Create root component option
  const app = {
    router,
    // This is necessary, it is for vue-meta
    head: {},
    render: h => h(App)
  }

  // 3. return
  return app
}