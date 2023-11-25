/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
//Observer类附加到每个被观察的对象，一旦附加，observer就会转换目标对象的所有属性，将其转换成`getter/setter`.
//其目的就是收集依赖和派发更新。其实就是我们前面所讲的发送通知。
export class Observer {
  // 观察对象
  value: any;
  // 依赖对象
  dep: Dep;
  // 实例计数器
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    // 初始化实例的 vmCount 为0
    this.vmCount = 0
    // 将实例挂载到观察对象的 __ob__ 属性上。
    def(value, '__ob__', this)
    // 数组的响应式处理,后面再看具体的实现
    if (Array.isArray(value)) {
      // export const hasProto = '__proto__' in {}
      // 判断当前浏览器是否支持对象的原型这个属性，目的完成浏览器兼容的处理
      if (hasProto) {
        //支持对象的原型，则调用如下的函数，
        //value是数组，
        //arrayMethods:数组相关的方法。
        //该方法重新设置数组的原型属性，对应的值为arrayMthods.
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }

      // 为数组中的每一个对象创建一个 observer 实例
      this.observeArray(value)
    } else {
      // 遍历对象中的每一个属性，转换成 setter/getter
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    // 获取观察对象的每一个属性
    const keys = Object.keys(obj)
    // 遍历每一个属性，设置为响应式数据
    for (let i = 0; i < keys.length; i++) {
      //该方法就是将对象中的属性转换成getter和setter.
      //当然在将属性转换成getter/setter前，也做了其它的一些处理，例如收集依赖，当数据发生变化后，发送通知等。
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  //变量传递过来的数组中方法的名字
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
     //给数组对象重新定义这些数组的方法，例如pop,push. 当然这些方法都是经过处理的。该方法的作用与protoAugment方法的一样
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 判断 value 是否是对象,如果不是对象，或者是VNode，直接返回，不做响应式的处理
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void //声明一个Observer类型的变量
  // 判断value中是否有'__ob__'这个属性，如果有，那么就需要判断value中的ob这个属性是否为Observer的实例
  //如果value中的ob属性是Observer的实例，在这就赋值给ob这个变量。最后直接返回ob.
  //这一点就和最开始我们说的是一样的，也是如果已经存在Observer对象，直接返回,相当于做了一个缓存的效果。
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    //如果value中没有ob这个属性，那么就需要创建一个Observer对象。
      //在创建Observer对象之前，需要做一些判断的处理。
      //这里我们重点看一下,如下的判断      
        //(Array.isArray(value) || isPlainObject(value)) &&
    //Object.isExtensible(value) &&
    //!value._isVue
      //(Array.isArray(value):判断传递过来的value是否为一个数组
      //isPlainObject(value)):判断value是否为一个对象。
      //!value._isVue:判断value是否为一个Vue的实例，在core/instance/index.js文件中，调用了initMixin方法，
      //在该方法中，设置了_isVue这个属性，如果传递过来的的value是Vue的实例就不要通过Observer设置响应式。
      //如果value可以进行响应式的处理，就需要创建一个Observer对象。
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // 创建一个 Observer 对象
    // 在Observer中把value中的所有属性转换成get与set的形式。
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 * 为一个对象定义一个响应式的属性
 */
//shallow的值为true,表示只监听对象中的第一层属性，如果是false那就是深度监听，也就是说当key这个属性的值是一个对象，那么还需要监听这个对象中的每个值的变化。
export function defineReactive (
  obj: Object,//目标对象
  key: string,//转换的属性
  val: any,
  customSetter?: ?Function,//用户自定义的函数，很少会用到。
  shallow?: boolean
) {
  // 创建依赖对象实例，其作用就是为key收集依赖，也就是收集所有观察当前key这个属性的所有的watcher.
  const dep = new Dep()
  // 获取 obj 的属性描述符对象,在属性描述符中可以定义getter/setter. 还可以定义configurable,也就是该属性是否为可配置的
  const property = Object.getOwnPropertyDescriptor(obj, key)
  //判断是否存在属性描述符并且configurable的值为false。如果configurable的值为false,表明是不可配置的，那么就不能通过delete将这个属性进行删除。、
  //也不能通过 Object.defineProperty进行重新的定义。
  //而在接下的操作中我们需要通过 Object.defineProperty对属性重新定义描述符，所以这里判断了configurable属性如果为false,则直接返回。
  if (property && property.configurable === false) {
    return
  }

  // 获取属性中的get和set.因为obj这个对象有可能是用户传入的，如果是用户传入的那么就有可能给obj这个对象中的属性设置了get/set.
  //所以这里先将用户设置的get和set存储起来，后面需要对get/set进行重写,为其增加依赖收集与派发更新的功能。
  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set

  //如果传入了两个参数（obj和key）,这里需要获取对应的key这个属性的值
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 判断shallow是否为false.如果当前的shallow是false,那么就不是浅层的监听。那么需要调用observe，也就是val是一个对象，那么需要将该对象中的所有的属性转换成getter/setter，observe方法返回的就是一个Observer对象
  let childOb = !shallow && observe(val)
  //下面就是通过Object.defineProperty将对象的属性转换成了get和set  
  Object.defineProperty(obj, key, {
    enumerable: true,//可枚举
    configurable: true,//可以配置
    get: function reactiveGetter () {
      // 首先调用了用户传入的getter,如果用户设置了getter，那么首先会通过用户设置的getter获取对象中的属性值。
      //如果没有设置getter,直接返回我们前面获取到的值。
      const value = getter ? getter.call(obj) : val
      //下面就是收集依赖（这块内容我们在一下小节中再来讲解，下面再来看一下set）
      // 如果存在当前依赖目标，即 watcher 对象，则建立依赖
      if (Dep.target) {
        dep.depend()
        // 如果子观察目标存在，建立子对象的依赖关系
        if (childOb) {
          childOb.dep.depend()
          // 如果属性是数组，则特殊处理收集数组对象依赖
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      // 返回属性值
      return value
    },
    set: function reactiveSetter (newVal) {
      //如果用户设置了getter,通过用户设置的getter获取对象中的属性值，否则直接返回前面获取到的值。
      const value = getter ? getter.call(obj) : val
      // 如果新值等于旧值或者新值旧值为NaN则不执行
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }

      // 如果没有 setter 直接返回
      // #7981: for accessor properties without setter
      if (getter && !setter) return

      // 如果setter存在则调用，为对象中的属性赋值
      if (setter) {
        setter.call(obj, newVal)
      } else {
        //当getter和setter都不存在，将新值赋值给旧值。
        val = newVal
      }
      // 如果新值是对象，那么把这个对象的属性再次转换成getter/setter
      //childOb就是一个Observe对象。
      childOb = !shallow && observe(newVal)
      // 派发更新(发布更改通知)
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
