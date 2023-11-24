/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

// 导入Vue的构造函数【初始化】
import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

//保留Vue实例的$mount方法，方便下面重写$mount的功能
const mount = Vue.prototype.$mount
//$mount:挂载，作用就是把生成的DOM挂载到页面中。
Vue.prototype.$mount = function (
  el?: string | Element,
  //非ssr情况下为false,ssr的时候为true
  hydrating?: boolean
): Component {

  //获取el选项，创建vue实例的时候传递过来的选项。
  //el就是DOM对象
  // query实现代码需要解析【ps】
  el = el && query(el)

  /* istanbul ignore if */

  //如果el为body或者是html,并且是开发环境，那么会在浏览器的控制台
  //中输出不能将Vue的实例挂载到<html>或者是<body>标签上
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    // 直接返回Vue实例
    return this
  }

  //获取options选项
  const options = this.$options
  // resolve template/el and convert to render function

  //判断options中是否有render(在创建vue实例的时候，也就new Vue的时候是否传递了render函数)
  if (!options.render) {
    //没有传递render函数。获取template模板，然后将其转换成render函数
    //关于将`template`转换成render的代码比较多，目录先知道其主要作用就可以了
    let template = options.template
    // 如果模板存在
    if (template) {
      // 判断模板对应类型如果是字符串
      if (typeof template === 'string') {
        // 如果模板是id选择器
        if (template.charAt(0) === '#') {
          //获取对应的DOM对象的innerHTML,作为模板
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // 如果模板是元素，返回元素的innerHTML
        template = template.innerHTML
      } else {
        //如果不是字符串，也不是元素，在开发环境中会给出警告信息，模板不合法
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        // 返回Vue实例
        return this
      }
    } else if (el) {
       //如果选项中没有设置template模板，那么获取el的outerHTML 作为模板
      template = getOuterHTML(el)
    }
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      //把template模板编译成render函数
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }

  //如果创建 Vue实例的时候，传递了render函数，这时会直接调用mount方法。
  // mount方法的作用就是渲染DOM,就是下面我们要看的./runtime/index文件中的$mount,只不过
   // 在当前的文件中重写了。【初始化】
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    // 如果有outerHTML属性，返回内容的HTML形式
    return el.outerHTML
  } else {
    // 创建div
    const container = document.createElement('div')
    // 把el的内容克隆，然后追加到div中
    container.appendChild(el.cloneNode(true))
    // 返回div的innerHTML
    return container.innerHTML
  }
}

// 注册Vue.compile方法，根据HTML字符串返回render函数
Vue.compile = compileToFunctions

export default Vue
