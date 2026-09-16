import assert from 'node:assert/strict';
import test from 'node:test';
import { generateAiAnalysisMarkdown, generateChatMarkdown } from '../src/utils/exportGenerators';

test('empty report export contains no invented patient findings', () => {
  const text = generateAiAnalysisMarkdown([], [], []);
  assert.match(text, /暂无报告/);
  assert.doesNotMatch(text, /\d+\s*(?:mg|μg|IU|mIU)/);
});

test('report export uses only supplied member and report data', () => {
  const member = {id:'test-member',name:'测试成员',relationship:'本人',age:25,gender:'male' as const,tags:[],avatarColor:'',healthStatusSummary:''};
  const report = {id:'test-report',memberId:member.id,title:'独立检查',hospital:'测试机构',date:'2030-01-01',category:'常规体检' as const,tags:[],summary:'用户提供摘要',keyFindings:[],indicators:[{id:'i',name:'测试项目',standardKey:'TEST',value:123,unit:'unit',referenceRange:'由报告提供',status:'info' as const}]};
  const text = generateAiAnalysisMarkdown([report], [member], []);
  assert.match(text, /独立检查/);
  assert.match(text, /测试机构/);
  assert.match(text, /123 unit/);
  assert.match(text, /测试成员/);
});

test('empty chat export does not add a predetermined clinical agenda', () => {
  const text = generateChatMarkdown([], [], 'all');
  assert.match(text, /暂无/);
  assert.doesNotMatch(text, /核心议题/);
});
