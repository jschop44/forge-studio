import {initializeDatabase} from './db';
import {initializePublishing} from './publishing';
import {initializeLeads} from './leads';
export async function migrate(){await initializeDatabase();await initializePublishing();await initializeLeads()}
