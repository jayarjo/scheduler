import { Scheduler } from "./Scheduler";
import { SchedulerStats } from "./SchedulerStats";

export * from './Task'
export * from './Scheduler'
export * from './SchedulerStats'

export const scheduler = new Scheduler();
export const schedulerStats = new SchedulerStats(scheduler);