import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const deps={...pkg.dependencies,...pkg.devDependencies};
for(const name of ['openai','@openai/agents','@openai/sdk']){
 assert.equal(deps[name],undefined,'Prohibited OpenAI API dependency: '+name);
}

const source=readFileSync('src/lib/server/local-ai.ts','utf8');
assert.match(source,/OPENAI_API_KEY/,'OpenAI API prohibition must remain enforced');
assert.match(source,/Paid\/cloud models are disabled/,'Paid cloud model rejection must remain enforced');
assert.match(source,/redirect:'error'/,'HTTP redirect blocking must remain enforced');
assert.match(source,/url\.protocol!=='http:'/,'Local-only HTTP enforcement must remain enabled');
assert.doesNotMatch(source,/https:\/\/ollama\.com\/api\/generate/,'Paid Ollama Cloud inference URL is prohibited');
assert.doesNotMatch(source,/api\.openai\.com/,'OpenAI API endpoint is prohibited');
console.log('Free-AI provider policy verified (static safeguards only).');
