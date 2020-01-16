import { TimeUnits } from './Task'

describe('Scheduler', () => {
  let scheduler
  let schedulerStats

  beforeEach(() => {
    //jest.useFakeTimers();
    const Scheduler = require('./').Scheduler
    const SchedulerStats = require('./').SchedulerStats
    scheduler = new Scheduler(false)
    schedulerStats = new SchedulerStats(scheduler)
  })

  afterEach(() => {
    scheduler.destroy()
    schedulerStats.reset()
  })

  test('runIn() - repeatTimesBeforeFail', done => {
    const spy = jest
      .fn(() => Promise.resolve('success'))
      .mockRejectedValueOnce('error')
      .mockRejectedValueOnce('error')

    scheduler.runIn(spy, 1, TimeUnits.SECOND).then(result => {
      expect(result).toBe('success')
      expect(spy).toHaveBeenCalledTimes(3)
      done()
    })

    // jest.advanceTimersByTime(30 * 1000);
  })

  test('runOnceIn()', done => {
    const spy = jest
      .fn(() => Promise.resolve('success'))
      .mockRejectedValueOnce('error')

    scheduler
      .runOnceIn(spy, 1000)
      .then(result => {
        expect(result).toBe('error')
        done()
      })
      .catch(error => {
        expect(error).toBe('error')
        done()
      })

    // jest.advanceTimersByTime(30 * 1000);
  })

  test('addTask(schema)', done => {
    const spy = jest.fn().mockResolvedValue('success')

    scheduler.addTask({
      fn: spy,
      at: Date.now(),
      interval: 1 * TimeUnits.SECOND
    })

    setTimeout(() => {
      expect(spy).toHaveBeenCalledTimes(3)

      expect(schedulerStats.failedRuns).toBe(0)
      expect(schedulerStats.successfulRuns).toBe(3)
      expect(schedulerStats.completed).toBe(0)
      done()
    }, 3 * 1000)

    // jest.advanceTimersByTime(30 * 1000);
  })

  test('addTask(fn)', done => {
    const spy = jest.fn().mockReturnValue('success')

    scheduler.addTask(spy)

    setTimeout(() => {
      expect(spy).toHaveBeenCalledTimes(1)

      expect(schedulerStats.failedRuns).toBe(0)
      expect(schedulerStats.successfulRuns).toBe(1)
      expect(schedulerStats.completed).toBe(1)
      expect(schedulerStats.total).toBe(0)
      done()
    }, 3 * 1000)

    // jest.advanceTimersByTime(30 * 1000);
  })
})
