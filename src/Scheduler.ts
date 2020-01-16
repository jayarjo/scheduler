import { random } from './Utils'
import EventEmitter from 'events'
import { Task, TaskSchema, TimeUnits, TaskState } from './Task'

export class Scheduler extends EventEmitter {
  tasks: Map<string, Task> = new Map()
  private timer

  constructor(private randomStart = true) {
    super()
    this.timer = setInterval(this.run.bind(this), 200)
  }

  run() {
    if (this.tasks.size) {
      this.tasks.forEach(this.runIfDue.bind(this))
    }
  }

  addTask(task: Task): string
  addTask(schema: TaskSchema): string
  addTask(fn: Function): string
  addTask(arg: any): string {
    const task = arg instanceof Task ? arg : new Task(arg)
    // to avoid simultaneous outburst of tasks distribute them over some period
    // TODO can be configurable
    if (this.randomStart && !task.at) {
      task.at = Date.now() + random(100, 10 * TimeUnits.SECOND)
    }
    this.tasks.set(task.uid, task)
    this.emit('taskAdded', task.uid)
    return task.uid
  }

  getTask(uid: string): Task {
    return this.tasks.get(uid)
  }

  runIn(
    fn: Function,
    amount: number,
    unit: TimeUnits = TimeUnits.MILLISECOND,
    repeatTimesBeforeFail = Infinity
  ): Promise<any> {
    const at = Date.now() + (unit ? amount * unit : amount)
    return new Promise((resolve, reject) => {
      this.addTask(
        new Task({
          fn,
          at,
          repeatTimesBeforeFail,
          onSuccess: result => resolve(result),
          onFailure: (error, task) =>
            task.state === TaskState.FAILED ? reject(error) : {}
        })
      )
    })
  }

  runOnceIn(fn: Function, amount: number, unit?: TimeUnits): Promise<any> {
    return this.runIn(fn, amount, unit, 0)
  }

  runEvery(
    fn: Function,
    interval: number,
    unit?: TimeUnits,
    repeatTimesBeforeFail?
  ): string {
    return this.addTask(
      new Task({
        fn,
        interval: unit ? interval * unit : interval,
        repeatTimesBeforeFail
      })
    )
  }

  removeTask(uid: string): void
  removeTask(task: Task): void
  removeTask(arg) {
    const task =
      arg instanceof Task ? this.tasks.get(arg.uid) : this.tasks.get(arg)

    if (task) {
      this.emit('taskRemoved', task.uid)
      this.tasks.delete(task.uid)
    }
  }

  clear() {
    this.tasks.clear()
  }

  destroy() {
    this.clear()
    clearInterval(this.timer)
    this.removeAllListeners()
  }

  private runIfDue(task: Task) {
    if (task.isDue) {
      this.runTask(task)
    }
  }

  private runTask(uid: string)
  private runTask(task: Task)
  private async runTask(arg: any) {
    const task = arg instanceof Task ? arg : this.tasks.get(arg)

    if (!task) {
      this.emit('error', Error(`no such task: ${arg}`), arg)
      return
    }

    this.emit('taskLaunched', task.uid)

    try {
      const result = await task.run()
      this.emit('taskSuccess', result, task.uid)
      return result
    } catch (error) {
      this.emit('taskFailed', error, task.uid)
    } finally {
      if (task.isComplete) {
        this.emit('taskCompleted', task.uid)
        this.removeTask(task)
      }
    }
  }
}
