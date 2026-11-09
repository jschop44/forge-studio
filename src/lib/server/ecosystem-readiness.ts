import {runtimeValue} from './runtime-env';
/** Public diagnostics expose readiness booleans only, never credentials or tenant data. */
export function ecosystemReadiness(value:(key:string)=>string|undefined=runtimeValue){
 const enabled=value('ENABLE_ECOSYSTEM_INTEGRATION')==='true';
 const signingConfigured=(value('FORGE_INTEGRATION_SECRET')||'').length>=32;
 const storageConfigured=Boolean(value('DATABASE_URL'));
 return {enabled,signingConfigured,storageConfigured,status:!enabled?'disabled':signingConfigured&&storageConfigured?'configured':'not-configured',requiresConsent:true};
}
