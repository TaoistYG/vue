/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    //将mixin这个对象中的所有成员拷贝到options中，this指的就是Vue
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
