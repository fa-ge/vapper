import cookie from '../lib/cookie'
import { createLocalVue } from '@vue/test-utils'

describe('vapper plugin cookie', () => {
  const LocalVue = createLocalVue()
  LocalVue.mixin({
    created () {
      this.$cookie = this.$root.$options.$cookie
    }
  })

  describe('client side', () => {
    test('set & get & delete cookie should be succeed', () => {
      const ctx = { type: 'client', rootOptions: {} }
      cookie(ctx)
      const vm = new LocalVue({
        $cookie: ctx.$cookie
      })
      expect(vm.$cookie.get()).toEqual({})
      vm.$cookie.set('foo', 1)
      vm.$cookie.set('bar', 2)
      expect(vm.$cookie.get('foo')).toBe('1')
      expect(vm.$cookie.get('bar')).toBe('2')
      expect(vm.$cookie.get('foo')).not.toBe(1)
      expect(vm.$cookie.get('bar')).not.toBe(2)
      expect(vm.$cookie.get('biz')).toBeUndefined()
      vm.$cookie.delete('foo')
      expect(vm.$cookie.get('foo')).toBeUndefined()
      vm.$cookie.set([{ name: 'biz', value: 3, options: { path: '/lv1' } }])
      vm.$cookie.delete()
      expect(document.cookie).toBe('')
      vm.$cookie.set([{ name: undefined }])
      vm.$cookie.delete()
      expect(document.cookie).toBe('undefined=')
    })
  })

  describe('server side', () => {
    const req = { headers: { cookie: '' } }
    const res = {
      headerSent: {},
      getHeader (key) { return this.headerSent[key] },
      setHeader (key, val) { this.headerSent[key] = val }
    }

    beforeEach(() => {
      req.headers.cookie = ''
      res.headerSent = {}
    })

    test('set & get & delete cookie should be succeed', () => {
      res.headerSent = { 'Set-Cookie': '' }
      const ctx = { pluginRuntimeOptions: {}, type: 'server', res, req, rootOptions: {} }
      cookie(ctx)
      const vm = new LocalVue({
        $cookie: ctx.$cookie
      })
      req.headers.cookie = 'foo=1; bar=2'
      expect(vm.$cookie.get('foo')).toBe('1')
      expect(vm.$cookie.get('bar')).toBe('2')
      expect(vm.$cookie.get('foo')).not.toBe(1)
      expect(vm.$cookie.get('bar')).not.toBe(2)
      expect(vm.$cookie.get()).toEqual({ foo: '1', bar: '2' })
      expect(vm.$cookie.get('biz')).toBeUndefined()
      vm.$cookie.delete('foo')
      expect(res.headerSent['Set-Cookie'][1]).toEqual(expect.stringContaining('foo=; Path=/; Expires='))
      vm.$cookie.set('biz', 3)
      expect(res.headerSent['Set-Cookie'][2]).toBe('biz=3; Path=/')
      vm.$cookie.delete()
      expect(res.headerSent['Set-Cookie'][3]).toEqual(expect.stringContaining('foo=; Path=/; Expires='))
      expect(res.headerSent['Set-Cookie'][4]).toEqual(expect.stringContaining('bar=; Path=/; Expires='))
    })

    test('operate cookie with fromRes should be succeed', () => {
      const ctx = { pluginRuntimeOptions: { cookie: { fromRes: true } }, type: 'server', res, req, rootOptions: {} }
      cookie(ctx)
      const vm = new LocalVue({
        $cookie: ctx.$cookie
      })
      req.headers.cookie = 'foo=1; bar=2'
      expect(vm.$cookie.get('foo')).toBe('1')
      expect(vm.$cookie.get('bar')).toBe('2')
      expect(vm.$cookie.get('foo')).not.toBe(1)
      expect(vm.$cookie.get('bar')).not.toBe(2)
      expect(vm.$cookie.get('biz')).toBeUndefined()
      vm.$cookie.delete('foo')
      expect(res.headerSent['Set-Cookie'][0]).toEqual(expect.stringContaining('foo=; Path=/; Expires='))
      vm.$cookie.set('biz', 3)
      expect(res.headerSent['Set-Cookie'][1]).toBe('biz=3; Path=/')
      expect(vm.$cookie.get('biz')).toBe('3')
      vm.$cookie.delete()
      expect(res.headerSent['Set-Cookie'][2]).toEqual(expect.stringContaining('foo=; Path=/; Expires='))
      expect(res.headerSent['Set-Cookie'][3]).toEqual(expect.stringContaining('bar=; Path=/; Expires='))
    })
  })
})
