import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {resourceBudget,stableCacheKey,shouldRetry} from './intelligence-resource-budget';
test('render workloads use conservative concurrency',()=>{assert.equal(resourceBudget('render').concurrency,1)});
test('cache keys normalize query ordering and remove fragments',()=>{assert.equal(stableCacheKey('metadata','https://example.com','/a?b=2&a=1#part'),stableCacheKey('metadata','https://example.com','/a?a=1&b=2'))});
test('retries only eligible temporary failures within budget',()=>{assert.equal(shouldRetry(503,0,'metadata'),true);assert.equal(shouldRetry(403,0,'metadata'),false);assert.equal(shouldRetry(503,1,'metadata'),false)});
