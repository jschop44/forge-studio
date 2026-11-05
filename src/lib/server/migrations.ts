import {initializeDatabase} from './db';
import {initializePublishing} from './publishing';
import {initializeLeads} from './leads';
import {initializeAssets} from './assets';
export async function migrate(){await initializeDatabase();await initializePublishing();await initializeLeads();await initializeAssets()}
