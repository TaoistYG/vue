/* @flow */

import { warn } from 'core/util/index'

export * from './attrs'
export * from './class'
export * from './element'

/**
 * Query an element selector if it's not an element already.
 * 若是dom对象，返回dom对象
 * 若是字符串，默认为选择器，去寻找相应dom元素，找到就返回，找不到的话，在开发模式下打印警告，并创建div元素返回
 */
export function query (el: string | Element): Element {
  // 如果el等于字符串，表明是选择器。
  // 否则是DOM对象，直接返回
  if (typeof el === 'string') {
    // 获取对应的DOM元素
    const selected = document.querySelector(el)
    if (!selected) {
      // 如果没有找到，判断是否为开发模式，如果是开发模式
      // 在控制台打印“找不到元素”
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      // 这时会创建一个`div`元素返回
      return document.createElement('div')
    }
    // 返回找到的dom元素
    return selected
  } else {
    return el
  }
}
