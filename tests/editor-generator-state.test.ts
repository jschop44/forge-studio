import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGeneratorEditorState,serializeGeneratorEditorState,type GeneratorEditorState} from '../src/lib/editor-generator-state';
const state:GeneratorEditorState={version:1,name:'Harbor Coffee',brief:'Coffee beans and ceramic mugs.',contactEmail:'hello@example.com',siteUrl:'https://example.com',referenceMarkup:'<style>body{color:red}</style>',designMode:'inspired',experienceStyle:'cinematic',visualDesignMode:'library',visualPatternId:'hospitality-story',autoImmersive:false,reviewIndustry:'Coffee roastery',reviewServices:'Coffee beans, Ceramic mugs'};
test('editor handoff preserves business inputs and design choices',()=>{
 assert.deepEqual(parseGeneratorEditorState(serializeGeneratorEditorState(state)),state);
});
test('invalid, oversized and approval-bearing context is rejected',()=>{
 for(const raw of [null,'{','x'.repeat(600001),JSON.stringify({...state,designMode:'execute'}),JSON.stringify({...state,visualPatternId:'unregistered'}),JSON.stringify({...state,brief:'x'.repeat(12001)}),JSON.stringify({...state,publishApproved:true}),JSON.stringify({...state,reviewApproved:true}),JSON.stringify({...state,token:'secret'})])assert.equal(parseGeneratorEditorState(raw),null);
});
