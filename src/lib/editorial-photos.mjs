// Centralized editorial photography mapping for content detail pages.
// Photographs are served with Unsplash image CDN parameters; no client-side JavaScript.
const photos={
 housing:'photo-1560518883-ce09059eeffa',
 home:'photo-1600596542815-ffad4c1539a9',
 mortgage:'photo-1560518883-ce09059eeffa',
 finance:'photo-1554224155-6726b3ff858f',
 business:'photo-1497366754035-f200968a6e72',
 car:'photo-1503376780353-7e6692767b70',
 electric:'photo-1592833159117-ac790d8d8f8d',
 documents:'photo-1486406146926-c627a92ad1ab',
 family:'photo-1511895426328-dc8714191300',
 technology:'photo-1451187580459-43490279c0fa',
 work:'photo-1497366811353-6870744d04b2',
 travel:'photo-1488646953014-85cb44e25828',
 calculator:'photo-1554224155-6726b3ff858f'
};
export function photoFor(item={}){
 const slug=String(item.slug??'').toLowerCase();
 const category=String(item.category??'').toLowerCase();
 const title=String(item.title??'').toLowerCase();
 const text=[slug,category,title].join(' ');
 let key='work';
 if(/hypot|uver|úver|refinan|spl[aá]tk|banka|úrok/.test(text))key='mortgage';
 else if(/byt|dom|nehnutel|kataster|bývan|byvan|nájom|najom/.test(text))key='home';
 else if(/elektro|nab[ií]j|bat[eé]ri|wallbox/.test(text))key='electric';
 else if(/auto|vozidl|doprav|stk|pzp|nehod|dialnic|diaľnic/.test(text))key='car';
 else if(/pas|ob[cč]iansk|doklad|úrad|urad|matrik|prepis|registr|pobyt/.test(text))key='documents';
 else if(/rodin|dedi[cč]|die[tť]|naroden|umrt|úmrt|sobas|svadb/.test(text))key='family';
 else if(/podnik|živnos|zivnos|firm|pr[aá]c/.test(text))key='business';
 else if(/cestov|dovolen|leten|turiz/.test(text))key='travel';
 else if(/spor|rozpo[cč]et|infl[aá]ci|invest|da[nň]|mzda|pr[ií]jem|v[yý]dav|financ/.test(text))key='finance';
 else if(/ai|digit|technol|internet|data|d[aá]t/.test(text))key='technology';
 return `https://images.unsplash.com/${photos[key]}?auto=format&fit=crop&w=1400&q=78`;
}
