# scheduler

```js
import { scheduler } from '@jayarjo/scheduler'

// run once in certain amount of time units (milliseconds by default)
scheduler.runIn(fn, 5000) // invoke fn in 5 secs

// run consequently with the specified interval
const taskId = scheduler.runEvery(fn, 1000) // invoke every second

// task can be removed if required after certain amount of time
setTimeout(() => {
  scheduler.removeTask(taskId)
}, 5000)
```
