/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

//数组构造函数的原型
const arrayProto = Array.prototype
//使用Object.create创建一个对象，让对象的原型指向arrayProto，也就是数组的prototype
export const arrayMethods = Object.create(arrayProto)

//我们可以看到，如下内容都是数组中的方法，而且这些方法会对数组进行修改，例如push向数组增加内容，造成了原有数组的更新。
//而当数组中的内容发生了变化后，我们要调用Dep中的notity方法发送通知。通知watcher,数据发生了变化，要重新更新视图。
//但是数组的原生方法不知道Dep,也就不会调用Dep中的notity方法。所以说要做一些处理。下面看一下怎样进行处理的
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
//对methodsToPatch数组进行遍历。
//method表示的是从methodsToPatch数组中取出来的方法的名字
methodsToPatch.forEach(function (method) {
  // cache original method
  // arrayProto：数组的原型，这里就是获取数组的原始方法，例如push,pop等
  const original = arrayProto[method]
  // 调用 Object.defineProperty() ，将method中存储的方法的名字，重新定义到arrayMthods,也就是给arrayMthods对象，重新定义push,pop等这些方法。
  // 方法的值，就是defineProperty()方法的第三个参数mutator，该方法需要参数args:该参数中存储的就是我们在调用push或者是pop时传递的内容。
  def(arrayMethods, method, function mutator (...args) {
    // 执行数组的原始方法
    const result = original.apply(this, args)
    // 获取数组关联的Observer对象
    const ob = this.__ob__
    //存储数组中新增的内容，例如如果是push,unshift，则将args赋值给inserted，因为这时args存储的就是新增的内容。
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        //如果是splice方法，那么把第三个值存储到inserted中。
        inserted = args.slice(2)
        break
    }
    // 如果有新增的元素，将会重新遍历数组中的元素，并且将其设置为响应式数据。也就是说，调用push,unshift,splice方法，向数组中添加的内容都是响应式的。
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 找到Observer中的dep对象，调用其中的notify方法来发送通知
    ob.dep.notify()
    // 返回方法执行的结果
    return result
  })
})
