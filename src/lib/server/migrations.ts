import {initializeDatabase} from './db';
import {initializePublishing} from './publishing';
import {initializeLeads} from './leads';
import {initializeAssets} from './assets';
import {initializeJobs} from './jobs';
import {initializeFeedback} from './feedback';
export async function migrate(){await initializeDatabase();await initializePublishing();await initializeLeads();await initializeAssets();await initializeJobs();await initializeFeedback()}
