import { Task, scheduler, TaskSchema, TimeUnits } from './'

export class Poller {
  polls: Map<string, Task> = new Map()

  // registry of polls that do not have specific interval and have to accomodate
  // to remaining quota
  floodingPolls: Map<string, boolean> = new Map()

  get isStarted() {
    return !!(this.polls.size && this.polls.size > this.unscheduledPolls.length)
  }

  get spareRate() {
    let spareRate = this.ratePerMin
    this.polls.forEach((poll) => {
      if (!this.isFlooding(poll)) {
        spareRate -= this.ratePerMinFor(poll.interval)
      }
    })
    return spareRate
  }

  get spareInterval() {
    const spareRate = this.spareRate
    return Math[spareRate < 0 ? 'ceil' : 'floor'](TimeUnits.MINUTE / spareRate)
  }

  get intervalForFloodingPoll() {
    // NOTE: observables might have made it cleaner here
    const spareInterval = this.spareInterval
    return spareInterval < 0 || !this.floodingPolls.size
      ? spareInterval
      : Math.floor(spareInterval * this.floodingPolls.size)
  }

  get unscheduledPolls(): Task[] {
    const unscheduledPolls = []
    this.polls.forEach((poll) => {
      if (!this.isScheduled(poll)) {
        unscheduledPolls.push(poll)
      }
    })
    return unscheduledPolls
  }

  constructor(private ratePerMin: number = 2000) {}

  addPoll(schema: TaskSchema) {
    return this.addPolls([schema])[0]
  }

  addPolls(schemas: TaskSchema[]) {
    schemas.forEach((schema) => {
      const poll = new Task(schema)
      this.polls.set(poll.uid, poll)
      if (!schema.interval) {
        this.floodingPolls.set(poll.uid, true)
      }
    })
    return this.start()
  }

  removePoll(poll: Task, reallocateFloodIntervals?: boolean)
  removePoll(uid: string, reallocateFloodIntervals?: boolean)
  removePoll(arg: any, reallocateFloodIntervals: boolean = true) {
    const poll = arg instanceof Task ? arg : this.polls.get(arg)
    if (poll) {
      this.floodingPolls.delete(poll.uid)
      this.polls.delete(poll.uid)

      if (reallocateFloodIntervals) {
        this.setIntervalInFloodingPolls(this.intervalForFloodingPoll)
      }
    }
  }

  isFlooding(uid: string): boolean
  isFlooding(poll: Task): boolean
  isFlooding(arg: any): boolean {
    return this.floodingPolls.has(arg instanceof Task ? arg.uid : arg)
  }

  isScheduled(uid: string): boolean
  isScheduled(poll: Task): boolean
  isScheduled(arg: any): boolean {
    return !!scheduler.getTask(arg instanceof Task ? arg.uid : arg)
  }

  ratePerMinFor(interval) {
    return interval < 0 ? 0 : TimeUnits.MINUTE / interval
  }

  setIntervalInFloodingPolls(interval) {
    this.floodingPolls.forEach((_, uid) => {
      this.polls.get(uid).interval = interval
    })
  }

  start() {
    const pollsToAdd = this.unscheduledPolls
    if (pollsToAdd.length) {
      const interval = this.intervalForFloodingPoll
      // it is meant that dev will test if there's a time slot for a given poll prior to trying to add it, if dev
      // ignores this prerequisite, then we abort everything and throw an exception directly into his face
      if (interval < 0) {
        // unregister polls
        pollsToAdd.forEach((poll) => {
          this.removePoll(poll, false)
        })
        throw new Error(
          `poller quota of ${
            this.ratePerMin
          }/min exceeded by ${this.ratePerMinFor(Math.abs(interval))}/min`
        )
      } else {
        const pollIds = []
        this.setIntervalInFloodingPolls(interval)
        // submit new polls as tasks to scheduler
        pollsToAdd.forEach((poll) => {
          pollIds.push(scheduler.addTask(poll))
        })
        return pollIds
      }
    }
  }

  stop() {
    this.polls.forEach((poll) => {
      scheduler.removeTask(poll.uid)
      poll.runAt(0) // at of 0 will be set automatically when task is re-added
    })
  }

  restart() {
    this.stop()
    this.start()
  }

  reset() {
    this.stop()
    this.polls.clear()
    this.floodingPolls.clear()
  }

  // deprecated
  destroy() {
    this.reset()
  }
}
