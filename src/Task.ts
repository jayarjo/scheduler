import { guid, isPromise } from './Utils'

export enum TaskState {
  IDLE = 'idle',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed'
}

export enum TimeUnits {
  MILLISECOND = 1,
  SECOND = 1000,
  MINUTE = TimeUnits.SECOND * 60,
  HOUR = TimeUnits.MINUTE * 60,
  DAY = TimeUnits.HOUR * 24,
  MONTH = TimeUnits.DAY * 30,
  YEAR = TimeUnits.DAY * 365
}

export type TaskSchema = {
  fn: Function
  args?: any[]
  at?: number // timestamp basically
  interval?: number // amount of ms between runs, if 0 - task won't be repeated
  repeatTimesBeforeFail?: number // for this to work run task should return a Promise
  onSuccess?: (result: any, task: Task) => void
  onFailure?: (error: Error, task: Task) => void
}

export class Task {
  private schema: TaskSchema

  private fails = 0

  private _uid: string = guid()
  get uid() {
    return this._uid
  }

  get at() {
    return this.schema.at
  }
  set at(value) {
    this.schema.at = value
  }

  get interval() {
    return this.schema.interval
  }
  set interval(value) {
    this.schema.interval = value
  }

  private _state: TaskState = TaskState.IDLE
  get state() {
    return this._state
  }

  get isIdle() {
    return this.state === TaskState.IDLE
  }

  get isComplete() {
    return this.state === TaskState.SUCCEEDED || this.state === TaskState.FAILED
  }

  get isDue() {
    return this.isIdle && Date.now() >= this.schema.at
  }

  get isOneTime() {
    return this.schema.interval <= 0
  }

  constructor(fn: Function)
  constructor(_schema: TaskSchema)
  constructor(arg: any) {
    const defaults = {
      args: [],
      at: 0,
      interval: 0,
      repeatTimesBeforeFail: 0,
      onSuccess: () => {},
      onFailure: () => {}
    }

    this.schema = Object.assign(
      {},
      defaults,
      typeof arg === 'function' ? { fn: arg } : arg
    )
  }

  /**
   * To differentiate between successful or failed run, fn should return a Promise.
   * Otherwise every run will be considered successful.
   */
  run(): Promise<any> {
    const {
      fn,
      args = [],
      onSuccess,
      onFailure,
      repeatTimesBeforeFail
    } = this.schema

    if (this._state !== TaskState.IDLE) {
      return Promise.reject(
        new Error(`task ${this.uid} is either already ${this.state}!`)
      )
    }

    const handleCompletion = isOk => {
      return result => {
        if (isOk) {
          if (this.isOneTime) {
            this._state = TaskState.SUCCEEDED
          } else {
            this.fails = 0
            this.schema.at = Date.now() + this.schema.interval
            this._state = TaskState.IDLE
          }
          setImmediate(() => {
            onSuccess(result, this)
          })
          return Promise.resolve(result)
        } else {
          if (this.isOneTime && this.fails >= repeatTimesBeforeFail) {
            this._state = TaskState.FAILED
          } else {
            this.fails++
            this.schema.at = Date.now() + Math.min(this.schema.interval, 100) // retry immediately
            this._state = TaskState.IDLE
          }
          setImmediate(() => {
            onFailure(result, this)
          })
          return Promise.reject(result)
        }
      }
    }

    this._state = TaskState.RUNNING
    const result = fn.apply(null, args)
    if (isPromise(result)) {
      return result.then(handleCompletion(true), handleCompletion(false))
    } else {
      return handleCompletion(true)(result)
    }
  }

  repeatEvery(interval: number, unit: TimeUnits = TimeUnits.MILLISECOND): Task {
    this.interval = interval * unit
    return this
  }

  runAt(time: number): Task
  runAt(date: Date): Task
  runAt(arg: any) {
    this.at = +arg
    return this
  }

  toString() {
    return this.uid
  }
}
