import {initializeDatabase} from './db';
import {initializePublishing} from './publishing';
export async function migrate(){await initializeDatabase();await initializePublishing()}
