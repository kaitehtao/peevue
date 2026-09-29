import {env} from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('Review storage unavailable');return env.DB;}
export function bucket(){if(!env.BUCKET)throw new Error('Photo storage unavailable');return env.BUCKET;}
