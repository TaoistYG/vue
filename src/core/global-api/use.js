/* @flow */

import { toArray } from '../util/index'
//参数为Vue的构造函数
export function initUse (Vue: GlobalAPI) {
  //为Vue添加use函数
  //plugin:是一个函数或者是对象，表示的就是插件
  Vue.use = function (plugin: Function | Object) {
    //installedPlugins：表示已经安装的插件
    //注意:this表示的是Vue的构造函数
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    //判断传递过来的plugin这个插件是否在installedPlugins中存在，如果存在表示已经注册安装了，直接返回
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this)
    //下面就是实现插件的注册，如果plugin中有install这个属性，表示传递过来的plugin表示的是对象
    //这时候直接调用plugin中的install完成插件的注册。也就是说如果在注册插件的时候，传递的是一个对象，这个对象中一定要有install这个方法，关于这块内容我们在前面的课程中也已经讲解过来。
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      //如果传递的是函数，直接调用函数
      plugin.apply(null, args)
    }

    //将插件添加的数组中
    installedPlugins.push(plugin)
    return this
  }
}
