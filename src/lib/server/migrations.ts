import {initializeDatabase} from './db';
import {initializeBusinessPublishing} from './business-publishing';
import {initializeLearningMemory} from './learning-memory';
import {initializePublishing} from './publishing';
import {initializeLeads} from './leads';
import {initializeAssets} from './assets';
import {initializeJobs} from './jobs';
import {initializeFeedback} from './feedback';
import {initializeRateLimits} from './rate-limits';
export async function migrate(){await initializeDatabase();await initializePublishing();await initializeBusinessPublishing();await initializeLeads();await initializeAssets();await initializeJobs();await initializeFeedback();await initializeLearningMemory();await initializeRateLimits()}
