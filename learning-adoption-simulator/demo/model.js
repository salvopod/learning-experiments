(function(scope){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const ATTRITION_BENCHMARKS=[{id:'enterprise',name:'Enterprise population',rate:10},{id:'shared-services',name:'Shared services',rate:12},{id:'digital-data',name:'Digital and data',rate:15},{id:'operations',name:'Operations',rate:8},{id:'leadership',name:'People leaders',rate:7},{id:'transformation',name:'Transformation cohort',rate:15}];
const SENIORITY_DEFAULTS=['Not specified','Individual contributor','Manager','Senior leader','Executive'].map(name=>({name,classroomEffect:0}));
const seniorityLevels=s=>s.seniority||SENIORITY_DEFAULTS;
const seniorityMix=d=>d.seniorityMix||[100,0,0,0,0];
function inAudience(p,audience){return audience==='existing'?(p.born===0&&p.cohortMember!==false):audience==='joiners'?p.born>0:true}
const JOURNEY_DEFAULT={channelMix:[60,25,15],channelReach:[100,100,100],infoChance:0,infoClearChance:70,managerRequired:false,managerChance:75,budgetRequired:false,budgetChance:65};
const journeySettings=s=>({...JOURNEY_DEFAULT,...s.programme.journey});
const CHANNELS=['Email','Campaign','Learning site'];
function journeyStage(p){return p.completed!==null?'completed':p.started!==null?'learning':p.registered!==null?(p.needsManager&&p.managerApproved===null?'approval':p.needsBudget&&p.budgetConfirmed===null?'budget':'registered'):p.infoPending?'information':p.opened!==null?'considering':p.assigned!==null?'unaware':'unassigned'}
const DEFAULT={version:1,name:'Learning launch — sample scenario',start:'2027-01',horizon:24,seed:42,
 departments:[
 {id:'operations',name:'Operations',headcount:120,hires:24,turnover:18,mandatoryHours:24,mandatoryDone:0,capacity:3,onboarding:8,mix:[20,40,20,20],historyInvited:100,historyStarted:58,historyCompleted:34,schedule:{}},
 {id:'commercial',name:'Commercial',headcount:80,hires:18,turnover:14,mandatoryHours:18,mandatoryDone:0,capacity:2.5,onboarding:6,mix:[25,30,30,15],historyInvited:80,historyStarted:46,historyCompleted:29,schedule:{}},
 {id:'technology',name:'Technology',headcount:100,hires:16,turnover:10,mandatoryHours:16,mandatoryDone:0,capacity:4,onboarding:10,mix:[40,25,25,10],historyInvited:90,historyStarted:65,historyCompleted:47,schedule:{}}],
 archetypes:[{name:'Self-directed',open:39,start:36,engagement:82,manager:8,color:'#d4ed95'},{name:'Time-poor',open:30,start:21,engagement:50,manager:12,color:'#80b7e1'},{name:'Relevance-led',open:31,start:24,engagement:68,manager:8,color:'#c8a1df'},{name:'Manager-guided',open:27,start:20,engagement:60,manager:30,color:'#e4aa77'}],
 programme:{name:'Practical AI at work',hours:8,modules:4,launch:1,deadline:3,audience:'all',baseline:{sponsor:false,manager:false,mandatory:false,protected:0,relevance:3}},
 alternative:{sponsor:true,manager:true,mandatory:false,protected:2,relevance:3},
 seasonal:[1.1,1,1,1,1,1,0.8,0.8,1.2,1.2,1.2,0.7]};
const finite=(v,min,max,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(label+' must be between '+min+' and '+max+'.')};
function validate(s){
 if(!s||s.version!==1)throw Error('Choose a Learning Lab scenario export (version 1).');
 if(typeof s.name!=='string'||s.name.length>120)throw Error('Scenario name is invalid.');
 if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(s.start))throw Error('Start month must be YYYY-MM, between 2000 and 2099.');
 if(![3,6,12,24].includes(s.horizon))throw Error('Horizon must be 3, 6, 12 or 24 months.');finite(s.seed,1,100000,'Population seed');
 if(!Array.isArray(s.departments)||!s.departments.length||s.departments.length>20)throw Error('Use between 1 and 20 departments.');
 if(s.seniority!==undefined){if(!Array.isArray(s.seniority)||s.seniority.length!==5)throw Error('Provide five seniority levels.');s.seniority.forEach((v,i)=>{if(!v||v.name!==SENIORITY_DEFAULTS[i].name)throw Error('Invalid seniority level.');finite(v.classroomEffect,-50,50,'Classroom willingness effect');if(i===0&&v.classroomEffect!==0)throw Error('Unspecified seniority must have a neutral effect.');})}
 if(s.programme?.delivery!==undefined&&!['self-paced','classroom'].includes(s.programme.delivery))throw Error('Invalid delivery format.');
 const ids=new Set();let total=0;
 for(const d of s.departments){if(!/^[a-z0-9-]{1,60}$/.test(d.id)||ids.has(d.id))throw Error('Department IDs must be unique.');ids.add(d.id);if(typeof d.name!=='string'||!d.name.trim()||d.name.length>80)throw Error('Enter a department name (up to 80 characters).');
 for(const [key,max] of Object.entries({headcount:5000,hires:2000,turnover:80,mandatoryHours:500,mandatoryDone:500,capacity:80,onboarding:200,historyInvited:100000,historyStarted:100000,historyCompleted:100000})){finite(d[key],0,max,d.name+': '+key)}
 for(const key of ['headcount','hires','historyInvited','historyStarted','historyCompleted'])if(!Number.isInteger(d[key]))throw Error(d.name+': '+key+' must be a whole number.');
 if(d.cohortSize!==undefined){finite(d.cohortSize,0,d.headcount,d.name+': closed cohort places');if(!Number.isInteger(d.cohortSize))throw Error('Closed cohort places must be whole numbers.');}
 if(d.mandatoryDone>d.mandatoryHours)throw Error(d.name+': completed mandatory hours cannot exceed annual assigned hours.');
 if(d.historyCompleted>d.historyStarted||d.historyStarted>d.historyInvited)throw Error(d.name+': historical completed ≤ started ≤ invited.');
 if(!Array.isArray(d.mix)||d.mix.length!==4||d.mix.some(v=>!Number.isFinite(v)||v<0)||Math.abs(d.mix.reduce((a,b)=>a+b,0)-100)>.01)throw Error(d.name+': archetype percentages must total 100.');
 if(d.seniorityMix!==undefined&&(!Array.isArray(d.seniorityMix)||d.seniorityMix.length!==5||d.seniorityMix.some(n=>!Number.isFinite(n)||n<0)||Math.abs(d.seniorityMix.reduce((a,b)=>a+b,0)-100)>.01))throw Error(d.name+': seniority percentages must total 100.');
 if(!d.schedule||typeof d.schedule!=='object'||Array.isArray(d.schedule))throw Error('Monthly workforce plan is invalid.');
 let overrideHires=0;for(const [k,v] of Object.entries(d.schedule)){if(!/^(?:[1-9]|1[0-9]|2[0-4])$/.test(k)||!v||typeof v!=='object')throw Error('Monthly overrides must use months 1–24.');for(const type of ['join','leave'])if(v[type]!==undefined&&v[type]!==null){finite(v[type],0,2000,'Monthly '+type);if(!Number.isInteger(v[type]))throw Error('Monthly counts must be whole numbers.');if(type==='join')overrideHires+=v[type]}}
 total+=d.headcount+d.hires*2+overrideHires;
 }
 if(total>10000)throw Error('Keep starting headcount plus planned two-year hires below 10,000 for this prototype.');
 if(!Array.isArray(s.archetypes)||s.archetypes.length!==4)throw Error('This version supports four archetypes.');for(const a of s.archetypes){if(typeof a.name!=='string'||!a.name.trim()||a.name.length>50||!/^#[0-9a-f]{6}$/i.test(a.color))throw Error('Invalid archetype name or colour.');for(const k of ['open','start','engagement','manager'])finite(a[k],0,100,a.name+': '+k)}
 const p=s.programme;if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>120)throw Error('Enter a programme name.');finite(p.hours,.5,200,'Programme hours');finite(p.modules,1,50,'Modules');finite(p.launch,1,24,'Launch month');finite(p.deadline,1,24,'Completion window');for(const k of ['modules','launch','deadline'])if(!Number.isInteger(p[k]))throw Error(k+' must be a whole number.');if(!['all','existing','joiners'].includes(p.audience))throw Error('Invalid audience.');
 const j=journeySettings(s);if(!Array.isArray(j.channelMix)||j.channelMix.length!==3||j.channelMix.some(v=>!Number.isFinite(v)||v<0)||Math.abs(j.channelMix.reduce((a,b)=>a+b,0)-100)>.01)throw Error('Discovery channel percentages must total 100.');if(!Array.isArray(j.channelReach)||j.channelReach.length!==3)throw Error('Provide three channel effectiveness values.');j.channelReach.forEach(v=>finite(v,0,150,'Channel effectiveness'));for(const k of ['infoChance','infoClearChance','managerChance','budgetChance'])finite(j[k],0,100,k);for(const k of ['managerRequired','budgetRequired'])if(typeof j[k]!=='boolean')throw Error('Invalid approval or budget setting.');
 if(p.profile!==undefined){if(!p.profile||typeof p.profile!=='object'||Array.isArray(p.profile))throw Error('Invalid programme profile.');for(const [k,v] of Object.entries(p.profile)){if(typeof v!=='string'||v.length>2000)throw Error('Programme profile values must be text, up to 2,000 characters.');}}
 for(const c of [p.baseline,s.alternative]){if(!c)throw Error('Missing scenario assumptions.');for(const k of ['sponsor','manager','mandatory'])if(typeof c[k]!=='boolean')throw Error('Invalid '+k+' setting.');finite(c.protected,0,8,'Protected hours');finite(c.relevance,1,5,'Relevance');}
 if(!Array.isArray(s.seasonal)||s.seasonal.length!==12)throw Error('Provide twelve monthly workload weights.');for(const n of s.seasonal)finite(n,.1,3,'Monthly workload weight');return s;
}
function random(seed,id,month,event){let h=2166136261;const str=[seed,id,month,event].join('|');for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return(h>>>0)/4294967296}
function monthDate(s,m){let [y,n]=s.start.split('-').map(Number);return new Date(Date.UTC(y,n-1+Math.max(0,m-1),1))}
function monthLabel(s,m){return m===0?'Before launch':monthDate(s,m).toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'})}
function annualDepartureProbability(rate){return 1-Math.pow(1-rate/100,1/12)}
function applyAttritionBenchmark(s,id,filter='all'){const benchmark=ATTRITION_BENCHMARKS.find(b=>b.id===id);if(!benchmark)throw Error('Unknown population benchmark.');if(filter!=='all'&&!s.departments.some(d=>d.id===filter))throw Error('Unknown department.');const next=clone(s);for(const d of next.departments)if(filter==='all'||d.id===filter){d.turnover=benchmark.rate;d.attritionBenchmark=benchmark.id;}return validate(next)}
function usePopulationDepartments(s){
 if(s.populationDepartmentsVersion===1)return clone(s);
 const next=clone(s);next.populationDepartmentsVersion=1;next.populationSetupBackup=clone(s);
 next.departments=ATTRITION_BENCHMARKS.map(b=>{
  const matched=s.departments.find(d=>d.name.trim().toLowerCase()===b.name.toLowerCase());
  return matched?{...clone(matched),turnover:b.rate,attritionBenchmark:b.id}:{id:b.id,name:b.name,headcount:0,hires:0,turnover:b.rate,attritionBenchmark:b.id,mandatoryHours:0,mandatoryDone:0,capacity:0,onboarding:0,mix:[25,25,25,25],seniorityMix:[100,0,0,0,0],historyInvited:0,historyStarted:0,historyCompleted:0,schedule:{},cohortSize:0};
 });
 return validate(next);
}
function workforce(s){let people=[],events=[{join:0,leave:0}],warnings=[];const counters={};
 function add(d,born){let n=counters[d.id]=(counters[d.id]||0)+1,id=d.id+'-'+n,r=random(s.seed,id,0,'type')*100,acc=0,t=3;for(let i=0;i<4;i++){acc+=d.mix[i];if(r<acc){t=i;break}}let sr=random(s.seed,id,0,'seniority')*100,sa=0,seniority=0;for(let i=0;i<5;i++){sa+=seniorityMix(d)[i];if(sr<sa){seniority=i;break}}people.push({id,department:d.id,type:t,seniority,born,leave:null,number:n})}
 for(const d of s.departments)for(let i=0;i<d.headcount;i++)add(d,0);
 for(let m=1;m<=s.horizon;m++){let join=0,leave=0;for(const d of s.departments){const override=d.schedule[m]||{},existing=people.filter(p=>p.department===d.id&&p.leave===null),hazard=annualDepartureProbability(d.turnover);let exiting;
 if(override.leave!==undefined&&override.leave!==null){if(override.leave>existing.length)warnings.push(d.name+' / '+monthLabel(s,m)+': departures capped at available headcount.');exiting=existing.slice().sort((a,b)=>random(s.seed,a.id,m,'exit')-random(s.seed,b.id,m,'exit')).slice(0,override.leave)}else exiting=existing.filter(p=>random(s.seed,p.id,m,'exit')<hazard);
 for(const p of exiting){p.leave=m;leave++}let hires=override.join??(Math.floor(m*d.hires/12)-Math.floor((m-1)*d.hires/12));for(let i=0;i<hires;i++)add(d,m);join+=hires;}events.push({join,leave});}
 for(const d of s.departments){const starting=people.filter(p=>p.department===d.id&&p.born===0).sort((a,b)=>random(s.seed,a.id,0,'cohort')-random(s.seed,b.id,0,'cohort'));starting.forEach((p,i)=>p.cohortMember=i<(d.cohortSize??d.headcount));}
 return{people,events,warnings};}
function simulate(s){validate(s);const work=workforce(s),prog=s.programme,dept=Object.fromEntries(s.departments.map(d=>[d.id,d]));const totalWeights=s.seasonal.reduce((a,b)=>a+b,0);const startCalendar=monthDate(s,1).getUTCMonth(),firstYear=monthDate(s,1).getUTCFullYear(),firstWeights=s.seasonal.slice(startCalendar).reduce((a,b)=>a+b,0);
 const journey=journeySettings(s);const plans=[prog.baseline,s.alternative].map(c=>{
 const states=work.people.map(p=>({...p,assigned:null,opened:null,started:null,completed:null,doneHours:0,debt:0,registered:null,managerApproved:null,budgetConfirmed:null,infoPending:false,needsManager:journey.managerRequired,needsBudget:journey.budgetRequired,events:[],history:[]}));const months=[];
 for(let m=0;m<=s.horizon;m++){
 let demandByDept={};for(const d of s.departments)demandByDept[d.id]={required:0,newHours:0,capacity:0,backlog:0};
 for(const p of states){if(p.born>m)continue;let channelRoll=random(s.seed,p.id,0,'channel')*100,channelSum=0,channel=2;for(let i=0;i<3;i++){channelSum+=journey.channelMix[i];if(channelRoll<channelSum){channel=i;break}}p.channel=channel;const log=(text)=>p.events.push({month:m,text});let nextChance=null,action='Not assigned',availableThisMonth=0;const d=dept[p.department],a=s.archetypes[p.type];if(p.leave!==null&&p.leave<=m){if(p.leave===m)log('Left the audience; no further enrolment or learning.');p.history[m]={journeyStage:'left',channel,nextChance:null,action:'No further actions',stage:'left',reason:'Left the department. Previous completions remain in historical totals.',hours:p.doneHours,debt:p.debt};continue}
 let reason='Programme has not launched yet.';
 if(m>0){const cal=monthDate(s,m),idx=cal.getUTCMonth(),annualRemaining=Math.max(0,d.mandatoryHours-d.mandatoryDone);let required=cal.getUTCFullYear()===firstYear?annualRemaining*s.seasonal[idx]/firstWeights:d.mandatoryHours*s.seasonal[idx]/totalWeights;if(p.born===m)required+=d.onboarding;
 const capacity=d.capacity+c.protected; p.debt+=required;const consumed=Math.min(capacity,p.debt);p.debt-=consumed;let available=capacity-consumed;availableThisMonth=available;
 const eligible=inAudience(p,prog.audience);let dm=demandByDept[p.department];if(eligible){dm.required+=required;dm.capacity+=capacity;dm.backlog+=p.debt;}
 if(m>=prog.launch&&eligible&&p.assigned===null){p.assigned=m;log("Assigned to the programme; discovery route: "+CHANNELS[channel]+".");}
 if(!eligible)reason='Outside this programme’s selected audience.';
 if(p.assigned!==null&&p.completed===null){dm.newHours+=Math.min(prog.hours-p.doneHours,prog.hours/prog.deadline);const rel=(c.relevance-3)*.08,clamp=x=>Math.max(.02,Math.min(.98,x));
 const openChance=Math.min(.98,clamp(a.open/100+(c.sponsor?.12:0)+(c.manager?.05:0)+(c.mandatory?.08:0))*journey.channelReach[channel]/100);
 const startChance=clamp(a.start/100+rel+(c.manager?a.manager/100:0)+(c.mandatory?.16:0)+(prog.delivery==='classroom'?seniorityLevels(s)[p.seniority].classroomEffect/100:0));
 if(p.opened===null&&random(s.seed,p.id,m,'open')<openChance){p.opened=m;log('Discovered the learning through '+CHANNELS[channel]+'.');if(random(s.seed,p.id,m,'needs-info')<journey.infoChance/100){p.infoPending=true;log('Requested more information before deciding.');}}
 if(p.infoPending&&m>p.opened&&random(s.seed,p.id,m,'info-clear')<journey.infoClearChance/100){p.infoPending=false;log('Received enough information to consider registering.');}
 if(p.opened!==null&&!p.infoPending&&p.registered===null&&available>0&&random(s.seed,p.id,m,'start')<startChance){p.registered=m;log('Registered interest in the programme.');}
 if(p.registered!==null&&p.needsManager&&p.managerApproved===null&&m>p.registered&&random(s.seed,p.id,m,'approval')<journey.managerChance/100){p.managerApproved=m;log('Manager approval received.');}
 const managerReady=!p.needsManager||p.managerApproved!==null;
 if(p.registered!==null&&managerReady&&p.needsBudget&&p.budgetConfirmed===null&&m>Math.max(p.registered,p.managerApproved||0)&&random(s.seed,p.id,m,'budget')<journey.budgetChance/100){p.budgetConfirmed=m;log('Budget confirmation received.');}
 if(p.registered!==null&&managerReady&&(!p.needsBudget||p.budgetConfirmed!==null)&&p.started===null&&available>0){p.started=m;log('Enrolment confirmed and learning started.');}
 const js=journeyStage(p);if(js==='unaware'){nextChance=openChance*100;action='Discover via '+CHANNELS[channel];}else if(js==='information'){nextChance=journey.infoClearChance;action='Information resolved';}else if(js==='approval'){nextChance=journey.managerChance;action='Manager approval';}else if(js==='budget'){nextChance=journey.budgetChance;action='Budget confirmed';}else if(js==='considering'){nextChance=available>0?startChance*100:0;action='Register interest';}else if(js==='registered'){nextChance=available>0?100:0;action='Enrol once time is available';}else action='Learning in progress';
 if(p.started!==null&&available>0){const effort=clamp(a.engagement/100+rel+(c.manager?.10:0)+(c.mandatory?.15:0));p.doneHours=Math.min(prog.hours,p.doneHours+available*effort*(.75+.5*random(s.seed,p.id,m,'effort')));if(p.doneHours>=prog.hours-1e-8){p.completed=m;p.doneHours=prog.hours;log("Programme completed.");}}
 reason=p.completed!==null?'Completed the programme’s modelled learning hours.':available<.05?'Existing mandatory learning uses the available time this month.':p.opened===null?'The invitation has not been opened under this run’s engagement assumptions.':p.started===null?'Aware of the programme; relevance, support and engagement affect the decision to start.':'Making progress using the time left after existing mandatory learning.';
 }else if(p.completed!==null){reason='Completed; retained in the active completion count.';action='Complete';}
 const gate=journeyStage(p);if(gate==='information')reason='Seeking more information before registration; information resolution can delay enrolment.';if(gate==='approval')reason='Registered interest; waiting for manager approval before enrolment.';if(gate==='budget')reason='Registered interest; waiting for budget confirmation before enrolment.';if(gate==='registered')reason='Registration checks complete; waiting for learning time to enrol.';
 }
 let stage=p.assigned===null?'unassigned':p.completed!==null?'completed':p.started!==null?'started':p.opened!==null?'opened':'invited';p.history[m]={stage,reason,hours:p.doneHours,debt:p.debt,journeyStage:journeyStage(p),channel,nextChance:p.completed!==null?null:nextChance,action:p.completed!==null?'Complete':action,available:availableThisMonth};
 }months.push(demandByDept);
 }return{people:states,months};});
 return{plans,work,audience:prog.audience};
}
function summary(result,m,filter='all',plan=1){const all=result.plans[plan].people.filter(p=>(filter==='all'||p.department===filter)&&p.born<=m&&inAudience(p,result.audience)),active=all.filter(p=>p.leave===null||p.leave>m),assigned=active.filter(p=>p.assigned!==null&&p.assigned<=m),stage={invited:0,opened:0,started:0,completed:0};for(const p of assigned)stage[p.history[m].stage]++;
 const departed=all.filter(p=>p.leave!==null&&p.leave<=m),completed=all.filter(p=>p.completed!==null&&p.completed<=m),joins=all.filter(p=>p.born>0).length;
 return{active,assigned,stage,joins,leavers:departed.length,leftIncomplete:departed.filter(p=>p.assigned!==null&&p.assigned<p.leave&&(p.completed===null||p.completed>=p.leave)).length,totalCompleted:completed.length,unassigned:active.length-assigned.length,rate:assigned.length?stage.completed/assigned.length*100:null};}
function turnoverRate(result,m,filter='all'){if(m===0)return null;let exposure=0,previous=summary(result,0,filter).active.length;for(let n=1;n<=m;n++){let current=summary(result,n,filter).active.length;exposure+=(previous+current)/2;previous=current}return exposure>0?summary(result,m,filter).leavers/(exposure/m)*100:null}
function journeyParticipants(result,m,filter='all',plan=1){return result.plans[plan].people.filter(p=>(filter==='all'||p.department===filter)&&p.born<=m&&inAudience(p,result.audience)&&p.assigned!==null&&p.assigned<=m)}
function journeyBreakdown(result,m,filter='all',plan=1){
 const s=summary(result,m,filter,plan),people=result.plans[plan].people.filter(p=>(filter==='all'||p.department===filter)&&p.born<=m&&inAudience(p,result.audience));
 const detailed={};for(const p of people){const key=p.history[m].journeyStage;detailed[key]=(detailed[key]||0)+1;}
 const milestones=Object.fromEntries(['assigned','opened','registered','managerApproved','budgetConfirmed','started','completed'].map(key=>[key,people.filter(p=>p[key]!==null&&p[key]<=m).length]));
 return {people,summary:s,detailed,milestones};
}
function cohortInputLimit(d){return d.headcount===0||d.headcountBasis==='cohort'?5000:d.headcount}
function setCohortAllocations(s,values){
 const next=clone(s);if(!Array.isArray(values)||values.length!==next.departments.length)throw Error('Enter cohort places for each population.');
 next.departments.forEach((d,i)=>{const n=values[i];if(!Number.isInteger(n)||n<0||n>cohortInputLimit(d))throw Error(d.name+': enter a whole cohort size up to '+cohortInputLimit(d)+'.');if(d.headcountBasis==='cohort'||(d.headcount===0&&n>0)){d.headcount=n;d.headcountBasis='cohort';}d.cohortSize=n;});
 return validate(next);
}
// Sample by identity, so changing plan or learner stage never changes the sample.
function journeyCardSample(people,m,limit,seed=0){return people.slice().sort((a,b)=>random(seed,a.id,0,'visual')-random(seed,b.id,0,'visual')||a.id.localeCompare(b.id)).slice(0,limit)}
const API={DEFAULT,usePopulationDepartments,cohortInputLimit,setCohortAllocations,journeyBreakdown,journeyParticipants,journeyCardSample,journeySettings,CHANNELS,seniorityLevels,seniorityMix,inAudience,ATTRITION_BENCHMARKS,applyAttritionBenchmark,annualDepartureProbability,clone,validate,simulate,summary,turnoverRate,monthLabel,monthDate,random};if(typeof module!=='undefined'&&module.exports)module.exports=API;else scope.LearningModel=API;
})(typeof globalThis!=='undefined'?globalThis:this);
