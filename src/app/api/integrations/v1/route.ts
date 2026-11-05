import {NextResponse} from 'next/server';
export async function GET(){return NextResponse.json({name:'forge-studio',apiVersion:'v1',capabilities:{auditImport:'planned',leadHandoff:'planned',siteExport:'local-only'},authentication:'not-configured',writesEnabled:false})}
