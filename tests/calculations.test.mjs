import test from 'node:test';import assert from 'node:assert/strict';import {annuity,calculate} from '../src/lib/calculations.mjs';
test('zero interest loan',()=>assert.equal(annuity(12000,0,1),1000));
test('loan rejects invalid duration',()=>assert.ok(Number.isNaN(annuity(1000,5,0))));
test('compound interest',()=>assert.equal(calculate('compound',{amount:100,rate:10,years:2})[0],121.00000000000001));
test('reserve',()=>assert.equal(calculate('reserve',{amount:6000,monthly:1500})[0],4));
test('trip',()=>assert.equal(calculate('trip',{km:100,cons:5,price:2})[0],10));
test('ev comparison',()=>assert.equal(calculate('compare',{km:10000,cons:7,price:2,cons2:20,price2:0.5})[0],400));
test('leasing zero interest',()=>assert.equal(calculate('lease',{amount:12000,monthly:0,rate:0,years:1})[0],1000));
test('no negative residual value',()=>assert.equal(calculate('depreciation',{amount:10000,rate:200,years:2})[0],0));