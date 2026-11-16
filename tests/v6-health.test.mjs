import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFinanceHealth as calculate} from '../src/lib/finance-health.mjs';
const input=extra=>({income:2500,expenses:1500,reserve:3000,debtPayments:400,targetMonths:6,savingMonthly:250,...extra});
test('reserve target, debt included once, surplus and target time use explicit inputs',()=>{
 const r=calculate(input());assert.equal(r.surplus,1000);assert.equal(r.reserveMonths,2);assert.equal(r.targetReserve,9000);assert.equal(r.reserveGap,6000);assert.equal(r.monthsToTarget,24);assert.equal(r.debtShare,16);assert.equal(r.planFunded,true);
});
test('cent arithmetic avoids rounding target time down and treats complete reserve as zero months',()=>{
 const r=calculate(input({income:100.03,expenses:100.01,reserve:100,targetMonths:1,savingMonthly:.01,debtPayments:0}));assert.equal(r.surplus,.02);assert.equal(r.reserveGap,.01);assert.equal(r.monthsToTarget,1);
 assert.equal(calculate(input({reserve:10000,savingMonthly:0})).monthsToTarget,0);
});
test('zero income and expenses do not divide by zero; no savings has unknown completion',()=>{
 const r=calculate(input({income:0,expenses:0,reserve:0,debtPayments:0,savingMonthly:0}));assert.equal(r.reserveMonths,null);assert.equal(r.debtShare,null);assert.equal(r.targetReserve,0);
 assert.equal(calculate(input({savingMonthly:0})).monthsToTarget,null);
});
test('deficit and unfunded savings are disclosed without claiming approval or safety',()=>{
 const r=calculate(input({income:1000,savingMonthly:200}));assert.equal(r.surplus,-500);assert.equal(r.savingCapacity,0);assert.equal(r.planFunded,false);assert.equal(r.notes.length,2);
});
test('missing fields, numeric strings, contradictory debt, excess precision and bounds are rejected',()=>{
 for(const extra of [{income:null},{reserve:undefined},{expenses:''},{income:'2500'},{debtPayments:2000},{reserve:-1},{reserve:Infinity},{reserve:1.001},{reserve:1000001},{targetMonths:0},{targetMonths:1.5},{unknown:3}])assert.throws(()=>calculate(input(extra)));
});
