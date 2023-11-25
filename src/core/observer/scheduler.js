/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools,
  inBrowser,
  isIE
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

// Async edge case #6566 requires saving the timestamp when event listeners are
// attached. However, calling performance.now() has a perf overhead especially
// if the page has thousands of event listeners. Instead, we take a timestamp
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
export let currentFlushTimestamp = 0

// Async edge case fix requires storing an event listener's attach timestamp.
let getNow: () => number = Date.now

// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res (relative to page load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
// All IE versions use low-res event timestamps, and have problematic clock
// implementations (#9632)
if (inBrowser && !isIE) {
  const performance = window.performance
  if (
    performance &&
    typeof performance.now === 'function' &&
    getNow() > document.createEvent('Event').timeStamp
  ) {
    // if the event timestamp, although evaluated AFTER the Date.now(), is
    // smaller than it, it means the event is using a hi-res timestamp,
    // and we need to use the hi-res version for event listener timestamps as
    // well.
    getNow = () => performance.now()
  }
}

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue () {
  currentFlushTimestamp = getNow()
  flushing = true //将flushing设置为true,表明正在处理队列
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  //组件的更新顺序是从父组件到子组件，因为先创建了父组件后创建了子组件
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  //组件的用户watcher,要在渲染watcher之前运行，因为用户watcher是在渲染watcehr之前创建的。
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 如果一个组件，在父组件执行前被销毁了，那么对应的watcher应该跳过。
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  //对队列中的watcher进行排序，排序的方式是根据对应id，从小到大的顺序 进行排序。也就是按照watcher的创建顺序进行排列。
  //为什么要进行排序呢？上面的注释已经给出了三点的说明
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  //以上注释的含义：不要缓存length,因为watcher在执行的过程中，还会向队列中放入新的watcher.
  for (index = 0; index < queue.length; index++) {
     //对队列进行遍历，然后取出当前要处理的watcher.
    watcher = queue[index]
    if (watcher.before) {
      //判断是否有before这个函数，该函数是在渲染watcher中具有的一个函数。其作用就是触发beforeupdate这个钩子函数。
      //也就是说走到这个位置beforeupate这个钩子函数被触发了。
      watcher.before()
    }
    id = watcher.id //获取watcher的id
    has[id] = null //将has[id]的值设为null,表明当前的watcher已经被处理过了
    watcher.run() //执行watcher中的run方法。下面看一下run方法中的源码。
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  resetSchedulerState()

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueWatcher (watcher: Watcher) {
  const id = watcher.id //获取watcher的id属性
  //has是一个对象，下面获取has中的值，如果为null,表示当前这个watcher对象还没有被处理。
  //下面加这个判断的目的，就是为了防止watcher被重复性的处理。
  if (has[id] == null) {
    has[id] = true //把has[id]设置为true,表明当前的watcher对象已经被处理了
    //下面就是开始正式的处理watcher
    //flushing为true,表明queue这个队列正在被处理。队列中存储的是watcher对象，也就是watcher对象正在被处理。
    //如果下面的判断条件成立，表明没有处理队列，那么就将watcher放到队列中
    if (!flushing) {
      queue.push(watcher)
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      //如果执行else表明队列正在被处理，那么这里需要找到队列中一个合适位置，然后把watcher插入到队列中。
      //那么这里是怎样获取位置的呢？
      //首先获取队列的长度。
      //index表示现在处理到了队列中的第几个元素，如果i大于index,则表明当前这个队列并没有处理完。
      //下面需要从后往前，取到队列中的每个watcher对象，然后判断id是否大于watcher.id,如果大于正在处理的这个watcher的id,那么这个位置就是插入watcher的位置

      let i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      //下面就是把待处理的watcher放到队列的合适位置。
      queue.splice(i + 1, 0, watcher)

      //上面的代码其实就是把当前将要处理的watcher对象放到队列中。
      //下面就开始执行队列中的watcher对象。
    }
    // queue the flush

    //下面判断的含义就是判断一下当前的队列是否正在被执行。
    //如果watiing为false,表明当前队列没有被执行，下面需要将waiting设置为true.
    if (!waiting) {
      waiting = true

      if (process.env.NODE_ENV !== 'production' && !config.async) {
        //开发环境直接调用下面的flushSchedulerQueue方法
        //flushSchedulerQueue方法的作用会遍历队列，然后调用队列中每个watcher的run方法。
        flushSchedulerQueue()
        return
      }
      //生产环境会将flushSchedulerQueue函数传递到nextTick函数中，后面再来讲解nextTick的应用。
      nextTick(flushSchedulerQueue)
    }
  }
}
