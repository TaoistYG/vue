/* @flow */

import Vue from 'core/index'
import config from 'core/config'
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser } from 'core/util/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
import platformDirectives from './directives/index'
import platformComponents from './components/index'

// install platform specific utils
//给Vue.config注册了方法，这些方法都是与平台相关的方法。这些方法是在Vue内部使用的。
Vue.config.mustUseProp = mustUseProp

//是否为保留的标签，也就是说，传递过来的内容是否为HTML中特有的标签
Vue.config.isReservedTag = isReservedTag

//是否是保留的属性，也就是说，传递过来的内容是否为HTML中特有的属性
Vue.config.isReservedAttr = isReservedAttr
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

// install platform runtime directives & components
//通过extend方法注册了与平台相关的全局的指令与组件。
//extend的作用就是将第二个参数的成员全部拷贝到第一个参数中
//那么问题是注册了哪些指令与组件呢？
extend(Vue.options.directives, platformDirectives)
extend(Vue.options.components, platformComponents)

// install platform patch function
// 在Vue的原型中注册了__patch__函数，patch函数的作用就是将虚拟DOM转换成真实的DOM.在给patch函数赋值的时候，首先判断是否为浏览器的环境，如果是则返回patch,否则返回noop,noop是一个空函数
Vue.prototype.__patch__ = inBrowser ? patch : noop

// public mount method
//给Vue原型注册了$mount方法，也就是给Vue的实例注册了$mount方法，在entry-runtime-with-compiler.js文件中对该方法进行了重写。
//在该方法中调用了mountComponent方法，用来渲染DOM
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}

// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Vue)
      } else if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test'
      ) {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        )
      }
    }
    if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` +
        `Make sure to turn on production mode when deploying for production.\n` +
        `See more tips at https://vuejs.org/guide/deployment.html`
      )
    }
  }, 0)
}

export default Vue
