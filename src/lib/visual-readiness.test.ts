import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {visualReadiness} from './visual-readiness';
import type {BrowserEvidence} from './browser-evidence';
const base:BrowserEvidence={version:1,sourceUrl:'https://example.com',capturedAt:'2026-11-06T00:00:00Z',viewport:{width:1280,height:800},pages:[{path:'/',title:'Example',screenshotUrl:'browser-screenshot.png',landmarks:[],interactions:[]}],warnings:[]};
test('local artifact does not count as generator-accessible screenshot',()=>{const r=visualReadiness(base);assert.equal(r.ready,false);assert.equal(r.screenshots,0)});
test('hosted screenshot counts as accessible evidence',()=>{const r=visualReadiness({...base,pages:[{...base.pages[0],screenshotUrl:'https://example.com/capture.png'}]});assert.equal(r.ready,true);assert.equal(r.screenshots,1)});
