import { Scheduler } from './Scheduler'

export class SchedulerStats {
  idle: number = 0
  running: number = 0
  completed: number = 0
  successfulRuns: number = 0
  failedRuns: number = 0

  get total() {
    return this.idle + this.running
  }

  get totalRuns() {
    return this.successfulRuns + this.failedRuns
  }

  constructor(s: Scheduler) {
    s.on('taskAdded', () => {
      this.idle++
    })

    s.on('taskLaunched', () => {
      this.running++
      this.idle--
    })

    s.on('taskCompleted', uid => {
      this.completed++
      this.running--
    })

    s.on('taskSuccess', () => {
      this.successfulRuns++
    })

    s.on('taskFailed', () => {
      this.failedRuns++
    })

    s.on('taskRemoved', uid => {
      const task = s.getTask(uid)
      if (task.isIdle) {
        this.idle--
      }
    })
  }

  reset() {
    this.idle = 0
    this.running = 0
    this.completed = 0
    this.successfulRuns = 0
    this.failedRuns = 0
  }
}
