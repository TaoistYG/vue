/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  //为configDef对象添加一个get方法，返回一个config对象
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    //如果不是生产环境，则为开发环境，这时会为configDef添加一个set方法，如果为config进行赋值操作，会出现不能给`Vue.config`重新赋值的错误。
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }

  // 初始化了`Vue.config`对象，该对象是Vue的静态成员
  //这里不是定义响应式数据，而是为Vue定义了一个config属性
  //并且为其设置了configDef约束。
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.

  //这些工具方法不视作全局API的一部分，除非你已经意识到某些风险，否则不要去依赖他们，也就是说，使用这些API会出现一些问题
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  //静态方法set/delete/nextTick
  //挂载到了Vue的构造函数中。后期会继续看内部源码的实现
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  //让一个对象变成可响应式的，内部调用了observe方法。
  
  Vue.observable = <T, >(obj: T): T => {
    observe(obj);
    return obj;
  };
  
  //初始化了Vue.options对象，并给其扩展了
  //components/directives/filters内容

  //创建了Vue.options对象，并且没有指定原型。这样性能更高。
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
      //从`ASSET_TYPES`数组中取出每一项，并为其添加了`s`,来作为Vue.options对象的属性。
      //也就是说给Vue.options中挂载了三个成员，
      //分别是：components/directives/filters，并且都初始化成了空对象。
      //这三个成员的作用是用来存储全局的组件，指令和过滤器，
      //我们通过Vue.component,Vue.directive,Vue.filter创建的组件，指令，过滤器最终都会存储到Vue.options中的这三个成员中。
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  //将Vue的构造函数存储到了_base属性中，后期会用到。
  Vue.options._base = Vue

  //设置keep-alive组件
  //extend方法的作用是将第二个参数中的属性，拷贝到第一个参数中。下面可以看一下extend方法的具体实现。
  extend(Vue.options.components, builtInComponents)

  //注册Vue.use(),用来注册插件
  initUse(Vue)
  //注册Vue.mixin( )实现混入
  initMixin(Vue)
  //注册Vue.extend( )基于传入的options返回一个组件的构造函数
  initExtend(Vue)
  // 注册Vue.directive(),Vue.component( ),Vue.filter( )
  initAssetRegisters(Vue)
}
