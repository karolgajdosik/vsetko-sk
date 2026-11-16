import test from 'node:test';
import assert from 'node:assert/strict';
import { createCase, emptyWorkspace, writeWorkspace, readWorkspace } from '../src/lib/workspace-store.mjs';
import { captureTransfer, planTransfer } from '../src/lib/workspace-values.mjs';
test('budget transfers average annual expenses with cents and zero income', () => {
  assert.deepEqual(captureTransfer('finance',{income:0,housing:100,food:20,transport:0,debt:0,other:0,annual:1}), {monthlyIncome:0,monthlyExpenses:120.08});
  assert.throws(()=>captureTransfer('finance',{income:100,housing:NaN}));
});
test('loan imports principal rather than property price and never changes purchase price on save', () => {
  assert.deepEqual(planTransfer('loan',{purchasePrice:200000,downPayment:40000,annualRate:4,loanYears:30}),{amount:160000,rate:4,years:30});
  assert.deepEqual(captureTransfer('loan',{rate:0,years:5}),{annualRate:0,loanYears:5});
  assert.deepEqual(planTransfer('loan',{purchasePrice:100,downPayment:200}),{});
});
test('savings only proposes positive available cashflow; finance preserves expense breakdown', () => {
  assert.deepEqual(planTransfer('savings',{monthlyIncome:2000.10,monthlyExpenses:1500}),{monthly:500.10});
  assert.deepEqual(planTransfer('savings',{monthlyIncome:1,monthlyExpenses:2}),{});
  assert.deepEqual(planTransfer('finance',{monthlyIncome:0,monthlyExpenses:100}),{'finance-income':0});
});
test('car transfer converts monthly costs and never transfers energy units', () => {
  assert.deepEqual(captureTransfer('auto',{km:20000,service:600,insurance:450}),{annualKm:20000,monthlyService:50,monthlyInsurance:37.5});
  assert.deepEqual(planTransfer('auto',{annualKm:20000,monthlyService:50,monthlyInsurance:37.5,consumption:25,fuelPrice:0.3}),{km:20000,service:600,insurance:450});
  assert.throws(()=>captureTransfer('auto',{km:200001,service:0,insurance:0}));
  assert.deepEqual(planTransfer('auto',{annualKm:-1,monthlyService:Infinity}),{});
});
test('own resources reject contradictory or blank values', () => {
  assert.throws(()=>captureTransfer('downpayment',{amount:100,monthly:101}));
  assert.throws(()=>captureTransfer('downpayment',{amount:'100',monthly:0}));
  assert.deepEqual(planTransfer('downpayment',{purchasePrice:200,downPayment:50}),{amount:200,monthly:50});
});

test('explicitly captured values survive strict case storage and transfer', () => {
  const item = createCase('home', 'Nové bývanie', '2026-11-16T12:00:00Z', 'bridge-test');
  const state = emptyWorkspace(); state.cases.push(item); state.activeCaseId = item.id;
  item.values = captureTransfer('downpayment', {amount:150000,monthly:30000});
  let data = null;
  const storage = {getItem:()=>data,setItem:(_key,value)=>{data=value;}};
  writeWorkspace(storage,state);
  assert.deepEqual(planTransfer('loan', readWorkspace(storage).cases[0].values),{amount:120000});
  const before = data;
  assert.throws(()=>writeWorkspace(storage,{...state,cases:[{...item,values:{purchasePrice:Infinity}}]}));
  assert.equal(data,before);
});
