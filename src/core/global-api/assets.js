/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */

  //变量ASSET_TYPES数组，为`Vue`定义相应的方法
  //ASSET_TYPES数组包括了`directive`,`component`,`filter`
  ASSET_TYPES.forEach(type => {

    //分别给Vue中的`directive`,`component`,`filter`注册方法
    Vue[type] = function (
      id: string, //是名字(组件，指令，过滤器的名字)
      definition: Function | Object //定义，可以是对象或者是函数，这两个参数可以通过查看手册：https://vuejs.bootcss.com/api/#Vue-directive
    ): Function | Object | void {
      if (!definition) {
        // 如果没有传递第二个参数，通过this.options找到之前存储的directive,component,filter，并返回
        //通过前面的学习，我们知道Vue.directive,Vue.component,Vue.filter都注册到了this.options['directives'],this.options['components'],this.options['filters']中
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }

        //判断从ASSET_TYPES数组中取出的是否为`component`(也就是是否为组件)
        //同时判断definition参数是否为对象
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id

          //this.options._base表示的是Vue的构造函数。
          //Vue.extend()：我们看过，作用就是将一个普通的对象转换成了VueComponent的构造函数、
          //看到这里，我们回到官方手册:https://vuejs.bootcss.com/api/#Vue-component
          // 注册组件，传入一个扩展过的构造器
          //Vue.component('my-component', Vue.extend({ /* ... */ }))
          // 注册组件，传入一个选项对象 (自动调用 Vue.extend)
          //Vue.component('my-component', { /* ... */ })
          //以上是官方手册中的内容，如果在使用Vue.component方法的时候，传递的第二个参数为Vue.extend,
          //那么会直接执行this.options[type + 's'][id] = definition这样代码，因为如果传递的是Vue.extend,那么以上if判断条件不成立。
          // 表示将definition对象的内容存储到this.options中，形式this.options[components]['my-component']
          //如果传递的是一个对象，那么会执行 this.options._base.extend(definition)这行代码。
          //那么现在我们就明白了文档中的这句话的含义:注册组件，传入一个选项对象 (自动调用 Vue.extend)
          definition = this.options._base.extend(definition)
        }

        //如果是指令，那么第二个参数可以是可以是对象，也可以是函数。
          //如果是对象，直接执行 this.options[type + 's'][id] = definition这行代码
          //如果是函数，会将definition设置给bind与update这两个方法，
          //在官方手册中，有如下内容
          // 注册 (指令函数)
        //Vue.directive('my-directive', function () {
            // 这里将会被 `bind` 和 `update` 调用
        //})
        //现在我们能够理解为什么会写`这里将会被 `bind` 和 `update` 调用`这句话了
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }

        //最终注册的Vue.component,Vue.filter,Vue.directive都会存储到this.options['components']
        //this.options['filters'],this.options['directives']中。是一个全局的注册。
        //Vue.component,Vue.filter,Vue.directive 是全局注册的组件，过滤器，指令
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
