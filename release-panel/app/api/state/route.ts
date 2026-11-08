import {state,json} from '@/lib/release/store';
export const dynamic='force-dynamic';
export async function GET(){return json(await state())}
