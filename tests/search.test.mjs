import test from 'node:test';
import assert from 'node:assert/strict';
import {searchPortal,normalizeSearch} from '../src/lib/search.mjs';
const items=[
 {title:'Občiansky preukaz',description:'Výmena dokladu',keywords:'obcianka',url:'/urady/'},
 {title:'Hypotekárna kalkulačka',description:'Výpočet splátky hypotéky',keywords:'hypoteka uver',url:'/kalkulacky/hypoteka/'},
 {title:'Prepis vozidla',description:'Prepis auta',keywords:'vozidlo',url:'/auto/'}
];
test('normalization handles Slovak diacritics',()=>assert.equal(normalizeSearch('Občianský PREUKAZ'),'obciansky preukaz'));
test('search finds accented title without accents',()=>assert.equal(searchPortal(items,'obciansky')[0].item.url,'/urady/'));
test('search supports synonym and intent words',()=>assert.equal(searchPortal(items,'ako prepis auta')[0].item.url,'/auto/'));
test('search tolerates a single typo',()=>assert.equal(searchPortal(items,'hypoteka kalkulacka')[0].item.url,'/kalkulacky/hypoteka/'));
test('empty and stopword-only queries return no results',()=>{assert.deepEqual(searchPortal(items,''),[]);assert.deepEqual(searchPortal(items,'ako sa mam'),[])});
test('ranking prioritizes title matches',()=>assert.equal(searchPortal(items,'preukaz')[0].item.url,'/urady/'));

test('short query does not match an unrelated substring in a keyword',()=>{
 const corpus=[{title:'Iná téma',description:'',keywords:'autobus',url:'/wrong/'},{title:'Auto',description:'Vozidlo',keywords:'auto',url:'/right/'}];
 const matches=searchPortal(corpus,'auto');
 assert.equal(matches[0].item.url,'/right/');
 assert.equal(matches.some(x=>x.item.url==='/wrong/'),false);
});
test('multiword query prioritizes coverage of all requested topics',()=>{
 const corpus=[{title:'Hypotéka',description:'Výpočet splátky',keywords:'uver',url:'/partial/'},{title:'Hypotéka a bývanie',description:'Kalkulačka splátky',keywords:'uver byvanie',url:'/complete/'}];
 assert.equal(searchPortal(corpus,'hypoteka byvanie')[0].item.url,'/complete/');
});
