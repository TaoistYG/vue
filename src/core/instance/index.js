import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

//Vue构造函数
function Vue (options) {
  //判断是否为生产环境，如果不等于生产环境并且如果this不是Vue的实例
  //那么说明用户将其作为普通函数调用，而不是通过new来创建其实例，所以会出现如下错误提示
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  //调用_init( )方法
  this._init(options)
}

//注册vm的_init( )方法，初始化vm
initMixin(Vue)
//注册vm（Vue实例）的$data/$props/$set/$delete/$watch
stateMixin(Vue)
//初始化事件相关的方法
//$on/$once/$off/$emit
eventsMixin(Vue)
//初始化生命周期相关的混入方法
// $forceUpdate/$destroy
lifecycleMixin(Vue)
//混入render
// $nextTick
renderMixin(Vue)

export default Vue
