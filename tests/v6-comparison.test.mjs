import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateVariant,compareDecisions,normalizeDecisions,comparisonCsv} from '../src/lib/decision-comparison.mjs';
const variant=(patch={})=>({name:'Variant',upfront:0,monthly:0,residual:0,principal:0,annualRate:0,loanMonths:0,...patch});
test('cash versus zero-interest financing does not double-count financed principal',()=>{
 const cash=variant({upfront:24000,monthly:100,residual:12000});
 const loan=variant({upfront:4000,principal:20000,loanMonths:48,monthly:100,residual:12000});
 const result=compareDecisions({months:24,variants:[cash,loan]});
 assert.equal(result.results[0].netCost,14400);assert.equal(result.results[1].netCost,14400);assert.equal(result.results[1].remainingDebt,9999.92);assert.equal(result.difference,0);
});
test('remaining debt, interest and cents are accounted at the end of the horizon',()=>{
 const result=evaluateVariant(variant({principal:1200,annualRate:12,loanMonths:12,monthly:0.01}),6);
 assert.equal(result.payment,106.62);assert.equal(result.installments,639.72);assert.equal(result.remainingDebt,617.89);assert.equal(result.netCost,1257.67);
 const paid=evaluateVariant(variant({principal:1200,annualRate:12,loanMonths:12}),24);assert.equal(paid.remainingDebt,0);assert.equal(paid.netCost,1200+paid.interest);
});
test('no-loan, equal variants and optimistic residual values remain explicit',()=>{
 assert.equal(evaluateVariant(variant({upfront:10,residual:20}),1).netCost,-10);
 assert.equal(compareDecisions({months:12,variants:[variant(),variant()]}).difference,0);
 for(const invalid of [{principal:1,loanMonths:0},{annualRate:1},{loanMonths:1},{monthly:0.001},{monthly:NaN},{annualRate:51}])assert.throws(()=>evaluateVariant(variant(invalid),12));
 assert.throws(()=>evaluateVariant(variant(),0));assert.throws(()=>compareDecisions({months:12,variants:[variant()]}));
});
test('strict backup schema rejects extra properties, duplicate ids and bad text',()=>{
 const item={id:'abc',title:'Auto',months:60,variants:[variant(),variant()]};
 const normalized=normalizeDecisions({version:1,comparisons:[item]});assert.deepEqual(normalized.comparisons[0],item);normalized.comparisons[0].title='Changed';assert.equal(item.title,'Auto');
 for(const bad of [{version:2,comparisons:[]},{version:1,comparisons:[],extra:1},{version:1,comparisons:[item,item]},{version:1,comparisons:[{...item,variants:[variant({extra:1}),variant()]}]},{version:1,comparisons:[{...item,title:'\n'}]}])assert.throws(()=>normalizeDecisions(bad));
});
test('CSV preserves all inputs and neutralizes spreadsheet formulas in names',()=>{
 const csv=comparisonCsv(' =HYPERLINK("x")',{months:12,variants:[variant({name:'@command'}),variant({name:'-variant'})]});
 assert.match(csv,/"' =HYPERLINK/);assert.match(csv,/"'@command"/);assert.match(csv,/"'-variant"/);assert.match(csv,/Zostatok dlhu/);assert.match(csv,/Počet splátok/);
});
