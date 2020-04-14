import { TimeUnits } from './'

describe('Poller', () => {
  let poller

  beforeEach(() => {
    jest.useFakeTimers()
    const Poller = require('./Poller').Poller
    poller = new Poller(100)
  })

  afterEach(() => {
    poller.destroy()
  })

  test('advanceTimersByTime', (done) => {
    setTimeout(() => {
      expect(true).toBe(true)
      done()
    }, 20 * 1000)
    jest.advanceTimersByTime(30 * 1000)
  })

  test('ratePerMinFor()', () => {
    expect(poller.ratePerMinFor(2000)).toBe(30)
    expect(poller.ratePerMinFor(20 * TimeUnits.MINUTE)).toBe(0.05)
  })

  test('addPolls() - should throw if ratePerMin quota is exceeded', () => {
    const noop = () => {}

    expect(() => {
      poller.addPolls([
        {
          fn: noop,
          interval: TimeUnits.SECOND,
        },
        {
          fn: noop,
          interval: TimeUnits.SECOND,
        },
      ])
    }).toThrow(`poller quota of 100/min exceeded by 20`)
  })

  test('addPolls() - polls without at property should be initialezed with random start time', () => {
    const noop = () => {}
    const pollIds = poller.addPolls([
      {
        fn: noop,
        interval: TimeUnits.SECOND,
      },
      {
        fn: noop,
      },
    ])
    const polls = pollIds.map((id) => poller.polls.get(id))
    expect(Math.abs(polls[0].at - polls[1].at)).toBeGreaterThanOrEqual(100)
  })

  test('spareRate, spareInterval, intervalForFloodingPoll', () => {
    const noop = () => {}

    const pollIds = poller.addPolls([
      {
        fn: noop,
        interval: TimeUnits.SECOND,
      },
      {
        fn: noop,
        interval: 2 * TimeUnits.SECOND,
      },
      {
        fn: noop,
      },
      {
        fn: noop,
      },
    ])

    expect(pollIds.length).toBe(4)
    expect(poller.polls.size).toBe(4)
    expect(poller.unscheduledPolls.length).toBe(0)
    expect(poller.floodingPolls.size).toBe(2)

    expect(poller.spareRate).toBe(10)
    expect(poller.spareInterval).toBe(6 * TimeUnits.SECOND)
    expect(poller.intervalForFloodingPoll).toBe(12 * TimeUnits.SECOND)

    let ratePerMin = 0
    poller.polls.forEach(
      (poll) => (ratePerMin += poller.ratePerMinFor(poll.interval))
    )
    expect(ratePerMin).toBe(100)
  })

  test('spareRate, spareInterval, intervalForFloodingPoll - try recalculation for additional flooding poll', () => {
    const noop = () => {}

    poller.addPolls([
      {
        fn: noop,
        interval: TimeUnits.SECOND,
      },
      {
        fn: noop,
        interval: 2 * TimeUnits.SECOND,
      },
      {
        fn: noop,
      },
      {
        fn: noop,
      },
    ])

    // add another flooding poll
    const pollId = poller.addPoll({
      fn: noop,
    })

    expect(typeof pollId).toBe('string')
    expect(poller.polls.size).toBe(5)
    expect(poller.unscheduledPolls.length).toBe(0)
    expect(poller.floodingPolls.size).toBe(3)

    expect(poller.spareRate).toBe(10)
    expect(poller.spareInterval).toBe(6 * TimeUnits.SECOND)
    expect(poller.intervalForFloodingPoll).toBe(18 * TimeUnits.SECOND)

    let ratePerMin = 0
    poller.polls.forEach(
      (poll) => (ratePerMin += poller.ratePerMinFor(poll.interval))
    )
    expect(ratePerMin).toBeLessThanOrEqual(100)
  })

  test('start(), isStarted, stop()', () => {
    const noop = () => {}

    poller.addPolls([
      {
        fn: noop,
      },
      {
        fn: noop,
      },
    ])

    expect(poller.isStarted).toBe(true)
    expect(poller.unscheduledPolls.length).toBe(0)

    poller.stop()

    expect(poller.isStarted).toBe(false)
    expect(poller.unscheduledPolls.length).toBe(2)

    poller.start()

    expect(poller.isStarted).toBe(true)
    expect(poller.unscheduledPolls.length).toBe(0)
  })

  test('removePoll()', () => {
    const noop = () => {}

    poller.addPolls([
      {
        fn: noop,
        interval: TimeUnits.SECOND,
      },
      {
        fn: noop,
        interval: 2 * TimeUnits.SECOND,
      },
      {
        fn: noop,
      },
      {
        fn: noop,
      },
    ])

    // add one separately and note down the uid
    const pollId = poller.addPoll({
      fn: noop,
    })

    expect(poller.polls.size).toBe(5)
    expect(poller.intervalForFloodingPoll).toBe(18 * TimeUnits.SECOND)

    let ratePerMin = 0
    poller.polls.forEach(
      (poll) => (ratePerMin += poller.ratePerMinFor(poll.interval))
    )
    expect(ratePerMin).toBeLessThanOrEqual(100)

    poller.removePoll(pollId)

    expect(poller.polls.size).toBe(4)
    expect(poller.intervalForFloodingPoll).toBe(12 * TimeUnits.SECOND)

    ratePerMin = 0
    poller.polls.forEach(
      (poll) => (ratePerMin += poller.ratePerMinFor(poll.interval))
    )
    expect(ratePerMin).toBeLessThanOrEqual(100)
  })

  test('destroy()', () => {
    const noop = () => {}

    poller.addPolls([
      {
        fn: noop,
        interval: TimeUnits.SECOND,
      },
      {
        fn: noop,
        interval: 2 * TimeUnits.SECOND,
      },
      {
        fn: noop,
      },
      {
        fn: noop,
      },
    ])

    poller.destroy()

    expect(poller.isStarted).toBe(false)
    expect(poller.polls.size).toBe(0)
    expect(poller.floodingPolls.size).toBe(0)
  })
})
