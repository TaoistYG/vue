/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  invokeWithErrorHandling,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    //将Vue的实例记录到了vm这个属性中。
    this.vm = vm
    if (isRenderWatcher) {
      //如果是渲染`Watcher`,则将`Watcher`的实例保存到`Vue`实例中的`_watcher`属性中。
      vm._watcher = this
    }

    //将所有的`Watcher`实例都保存到`Vue`实例中的`_watchers`这个数组中。
    // _watchers数组中不仅存储了渲染`Watcher`,还存储了计算属性对应的watcher,还有就是侦听器。
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    //创建渲染watcher的实例的时候，传递过来的cb函数就是一个noop空函数。
    //如果是用户创建的`Watcher`的时候，传递过来的就是一个回调函数。
    this.cb = cb
    this.id = ++uid // uid for batching //为了区分每个watcher,创建一个编号 uid for batching
    this.active = true // active表示这个watcher是否为活动的watcher,如果为true,则为活动的watcher.
    this.dirty = this.lazy // for lazy watchers
    //下面的集合记录的都是Dep
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
     //判断expOrFn是否为函数，我们在前面创建渲染watcher的时候，传递过来的updateComponent函数给了expOrFn这个参数。
    if (typeof expOrFn === 'function') {
      //将函数保存到了getter中。
      this.getter = expOrFn
    } else {
      // expOrFn 是字符串的时候，也就是创建侦听器的时候传递的内容，例如 watch: { 'person.name': function... }
      // 这时候侦听器侦听的内容是字符串，也就是person.name
      // parsePath('person.name') 返回一个函数获取 person.name 的值
      //parsePath的作用就是生成一个函数，来获取`person.name`的值。将返回的函数记录到了getter中。记录geeter中的目的，就是当获取属性值的时候会触发对应的getter,当触发getter的时候会触发依赖。
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    //如果是计算属性，lazy的值为true,表示延迟执行。如果是渲染watcher,会立即调用get方法
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {
    //把当前的watcher对象入栈，并且把当前的watcher赋值给Dep的target属性。
    //当有父子组件嵌套的时候，先将父组件的watcher入栈，然后对子组件进行处理，处理完毕后，在从栈中获取父组件的watcher进行处理
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      //对getter函数进行调用，如果是渲染函数，这里调用的是updateComponent
      //当updateComponent函数执行完毕后会将虚拟DOM转换成真实的DOM,然后渲染到页面中。
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        //表示进行深度监听，深度监听表示的就是如果监听的是一个对象的话，会监听这个对象下的子属性、
        traverse(value)
      }
      //处理完毕后，做一些清理的工作，例如将watcher从栈中弹出
      popTarget()
      //将Watcher从subs数组中移除
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep (dep: Dep) {
    //唯一表示，每次创建一个Dep对象的时候，会让该编号加1，这里可以进入Dep中查看。例如，在页面中有两个{{msg}}，针对这个属性，只会收集一次依赖，即使使用两次msg，这样就避免了重复收集依赖
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      //如果在newDepIds集合中没有id,将其添加到该集合中。
      this.newDepIds.add(id)
      //将dep对象添加到newDeps集合中。
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        // 调用dep对象中的addSub方法，将Watcher对象添加到subs数组中。this为Watcher对象。
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    //在渲染watcher的时候，把lazy属性与sync属性设置为了false
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      //渲染watcher会执行queueWatcher,
      //该方法的作用就是将watcher的实例放到一个队列中。
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    //标记当前的watcher对象是否为存活的状态。active默认值为true,表明可以对watcher进行处理。
    if (this.active) {
      //调用watcher对象中的get方法，在get方法中会进行判断，如果是渲染watcher会调用updatecomponent方法，来渲染组件，更新视图
      //对于渲染watcher来说，对应的updateComponent方法是没有返回值，所以常量value的值为undefined.所以下面的代码不在执行，但是是用户 watcher,那么会调用其对应的回调函数，我们创建侦听器的时候，指定了回调函数。
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          const info = `callback for watcher "${this.expression}"`
          invokeWithErrorHandling(this.cb, this.vm, [value, oldValue], this.vm, info)
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
