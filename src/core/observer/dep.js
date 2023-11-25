/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  // 将Watcher对象添加到subs数组中。
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 将观察对象和watcher建立依赖
  depend () {
    if (Dep.target) {
      // 如果target 存在，把 dep 对象添加到 watcher 的依赖中
      Dep.target.addDep(this)
    }
  }

  // 发布通知
  notify () {
    // stabilize the subscriber list first
    //subs数组中存储的就是`watcher`对象，调用slice方法实现了克隆，因为下面会对subs数组中的内容进行排序。
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      //按照Watcher对象中的id值进行从小到大的排序，也就是按照`watcher`的创建顺序进行排序，从而保证了在执行`watcher`的时候顺序是正确的。
      subs.sort((a, b) => a.id - b.id)
    }

    // 调用每个watcher对象的update方法实现更新
    for (let i = 0, l = subs.length; i < l; i++) {

      // 对subs数组进行遍历，然后获取对应的Watcher,然后调用Watcher对象的update方法，
      subs[i].update()
    }
  }
}

// Dep.target 用来存放目前正在使用的watcher
// 全局唯一，并且一次也只能有一个watcher被使用
// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []

// 入栈并将当前 watcher 赋值给 Dep.target
// 父子组件嵌套的时候先把父组件对应的 watcher 入栈，
// 再去处理子组件的 watcher，子组件的处理完毕后，再把父组件对应的 watcher 出栈，继续操作
export function pushTarget (target: ?Watcher) {

   //将Watcher对象存储到栈中。
    //因为在V2.0以后每一个组件对应一个Watcher对象，如果组件之间有嵌套，先处理子组件，所以这时应该先将父组件的	`Watcher`存储起来，这里是存储到栈中了，
    //子组件处理完毕后，把父组件中的Watcher从栈中弹出，继续处理父组件。
  targetStack.push(target)
  Dep.target = target
}

export function popTarget () {
  // 出栈操作
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
