import type {BusinessContext} from './integrations/contracts';
export type Finding={title:string;reason:string;priority:'high'|'medium'|'low';action:string};
export function analyzeContext(c:BusinessContext){
 const findings:Finding[]=[];
 if(!c.website)findings.push({title:'Create a business website',reason:'No website address was provided',priority:'high',action:'Create a responsive website in Forge Studio'});
 if(!c.summary)findings.push({title:'Complete business profile',reason:'No business summary was supplied',priority:'medium',action:'Describe the target audience and services'});
 for(const issue of c.issues)findings.push({title:issue.title,reason:'Imported from '+c.source,priority:issue.priority,action:issue.recommendation});
 if(c.website&&!c.issues.length)findings.push({title:'Verify website performance',reason:'No verified audit issues were provided',priority:'medium',action:'Run a Growth Lens audit'});
 return {businessName:c.businessName,source:c.source,findings,confidence:'heuristic-only' as const};
}
