import {migrate} from '../src/lib/server/migrations';
async function main(){if(!process.env.DATABASE_URL){throw Error('DATABASE_URL is required')}await migrate();process.stdout.write('Forge Studio schema initialized successfully\n')}
main().catch(error=>{process.stderr.write(String(error)+'\n');process.exitCode=1});
