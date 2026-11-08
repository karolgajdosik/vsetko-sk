import Dashboard from './dashboard';
import {state} from '@/lib/release/store';
export const dynamic='force-dynamic';
export default async function Page(){
  try{return <Dashboard initial={await state()} initialError=""/>}
  catch{return <Dashboard initial={{repo:null,reports:[],decisions:[]}} initialError="Údaje sa nepodarilo načítať. Skús ich obnoviť."/>}
}
