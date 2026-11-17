'use strict';
/* ================= utilidades ================= */
const KEY='sisgem-prototipo-v2';
const VALOR_BASE=400, VALOR_HORA=20, LIMITE_EXTRA=10, QTD_SIM=5;
let S=null; let confirmFn=null;
const ui={route:null,param:null,authMode:'login',modal:null};
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const TODAY=iso(new Date());
const addDays=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return iso(d)};
const daysBetween=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);
const CUR_MONTH=TODAY.slice(0,7);
const semOf=s=>s.slice(0,4)+'/'+(+s.slice(5,7)<=6?1:2);
const SEM=semOf(TODAY);
const inMonth=off=>{const d=addDays(TODAY,-off);const m0=CUR_MONTH+'-01';return d<m0?m0:d};
const fmt=s=>s?`${s.slice(8,10)}/${s.slice(5,7)}`:'—';
const fmtY=s=>s?`${s.slice(8,10)}/${s.slice(5,7)}/${s.slice(0,4)}`:'—';
const MESES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const fmtMes=m=>MESES[+m.slice(5,7)-1]+'/'+m.slice(0,4);
const prevMonth=m=>{const d=new Date(m+'-15T12:00:00');d.setMonth(d.getMonth()-1);return iso(d).slice(0,7)};
const DIAS=['SEG','TER','QUA','QUI','SEX'];
const DIA_NOME={SEG:'Segunda',TER:'Terça',QUA:'Quarta',QUI:'Quinta',SEX:'Sexta'};
const nextDate=dia=>{const target=DIAS.indexOf(dia)+1;let d=addDays(TODAY,1);for(let i=0;i<8;i++){if(new Date(d+'T12:00:00').getDay()===target)return d;d=addDays(d,1)}return d};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const nota=v=>v==null?'—':Number(v).toFixed(1).replace('.',',');
const hhmm=ts=>{const d=new Date(ts);return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`};
async function sha(t){
  try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  catch(e){let h=2166136261;for(const c of t){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return 'f'+(h>>>0).toString(16)}
}
const user=id=>S.users.find(u=>u.id===id);
const disc=id=>S.disciplinas.find(d=>d.id===id)||{nome:'—'};
const me=()=>S&&S.session?user(S.session):null;
const monOf=uid=>S.monitorias.find(m=>m.alunoId===uid&&m.status==='ATIVA');
const monById=id=>S.monitorias.find(m=>m.id===id);
const monNome=id=>{const m=monById(id);return m?user(m.alunoId).nome:'—'};
const edital=id=>S.editais.find(e=>e.id===id);
const nid=p=>p+(S.seq++);
const coordIds=()=>S.users.filter(u=>u.perfil==='coordenacao').map(u=>u.id);
function log(acao){acao=semCodigo(acao);S.log.unshift({ts:new Date().toISOString(),userId:S.session,acao});S.log=S.log.slice(0,200)}
function notify(uid,msg){msg=semCodigo(msg);S.notifs.unshift({id:nid('n'),userId:uid,msg,ts:new Date().toISOString(),lida:false})}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
const semCodigo=m=>String(m).replace(/\s*\((?:RN|RNF|RF)\d+\)/g,'');
function toast(msg,kind=''){msg=semCodigo(msg);const t=document.createElement('div');t.className='toast '+kind;t.textContent=msg;document.getElementById('toasts').appendChild(t);setTimeout(()=>t.remove(),4200)}
const rn=c=>'';
const PERFIL={aluno:'Aluno',monitor:'Monitor',professor:'Professor(a)',coordenacao:'Coordenação'};
const MOTIVO={FALTA_RECORRENTE:'2ª falta não justificada no semestre',AVALIACAO_NEGATIVA_RECORRENTE:'2ª avaliação negativa consecutiva homologada',INFRACAO_GRAVE:'Infração grave'};
const MOTIVO_RN={FALTA_RECORRENTE:'RN12',AVALIACAO_NEGATIVA_RECORRENTE:'RN13',INFRACAO_GRAVE:'RN15'};
const PILL={ABERTO:['ok','Aberto'],AGENDADO:['info','Em breve'],ENCERRADO:['','Encerrado'],RASCUNHO:['warn','Rascunho'],PUBLICADO:['ok','Publicado'],
  EM_AVALIACAO:['info','Em avaliação'],APROVADO:['ok','Aprovado pela banca'],REPROVADO:['bad','Reprovado'],
  PENDENTE:['warn','Pendente'],ACEITO:['ok','Confirmado'],REJEITADO:['bad','Rejeitado'],CONCLUIDO:['info','Concluído'],FALTA_ALUNO:['bad','Falta do aluno'],
  HOMOLOGADA:['bad','Homologada'],REJEITADA:['','Rejeitada'],APROVADA:['ok','Aprovada'],
  ATIVA:['ok','Ativa'],DESLIGADA:['bad','Desligada'],INJUSTIFICADA:['bad','Não justificada'],JUSTIFICATIVA_ENVIADA:['warn','Justificativa em análise'],ACEITA:['ok','Justificada']};
const pill=(k,label)=>{const p=PILL[k]||['',k];return `<span class="pill ${p[0]}">${esc(label||p[1])}</span>`};
const fld=(label,name,input)=>`<label class="fld"><span>${label}</span>${input}<em class="ferr" data-err="${name}"></em></label>`;
const ph=(tag,title,sub)=>`<div class="ph"><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>`;
const empty=m=>`<div class="empty">${m}</div>`;
function showErrors(form,errs){
  form.querySelectorAll('.ferr').forEach(x=>x.textContent='');
  form.querySelectorAll('[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));
  const keys=Object.keys(errs);
  keys.forEach(k=>{const el=form.querySelector(`[data-err="${k}"]`);if(el)el.textContent=semCodigo(errs[k]);const inp=form.querySelector(`[name="${k}"]`);if(inp)inp.setAttribute('aria-invalid','true')});
  if(keys.length){const f=form.querySelector('[aria-invalid]');if(f)f.focus()}
  return keys.length>0;
}
function go(route,param=null){ui.route=route;ui.param=param;ui.topo=true;ui.menu=false;render()}
function ask(title,body,label,fn,danger){ui.modal={title,body,label,danger};confirmFn=fn;render()}

/* ================= regras de negócio ================= */
function edStatus(e){if(e.status==='RASCUNHO')return 'RASCUNHO';if(e.status==='ENCERRADO'||TODAY>e.fim)return 'ENCERRADO';if(TODAY<e.inicio)return 'AGENDADO';return 'ABERTO'}
function vagasRestantes(e){return e.vagas-S.monitorias.filter(m=>m.editalId===e.id).length}
function carencia(uid){
  const ds=S.desligamentos.filter(d=>d.userId===uid);
  if(ds.some(d=>d.permanente))return {permanente:true};
  const c=ds.filter(d=>d.carenciaAte&&d.carenciaAte>=TODAY).sort((a,b)=>a.carenciaAte<b.carenciaAte?1:-1)[0];
  return c?{ate:c.carenciaAte}:null;
}
function elegibilidade(u,e){ /* UC04 — RN3, RN4, RN7, RN14, RN15 */
  const st=edStatus(e), n=u.notas[e.discId], mon=monOf(u.id);
  const cand=S.candidaturas.find(c=>c.alunoId===u.id&&c.semestre===SEM&&c.status!=='REPROVADO');
  const car=carencia(u.id);
  const checks=[
    {rn:'RN4',ok:st==='ABERTO',txt:st==='ABERTO'?`Dentro do período do edital (${fmt(e.inicio)} a ${fmt(e.fim)}).`:`Fora do período de candidatura (${fmt(e.inicio)} a ${fmt(e.fim)}).`},
    {rn:'RN3',ok:n!=null&&n>=8,txt:n==null?'A disciplina não consta no seu histórico acadêmico.':n>=8?`Nota final ${nota(n)} na disciplina (mínimo 8,0).`:`Nota final ${nota(n)} é inferior a 8,0.`},
    {rn:'RN7',ok:!mon&&!cand,txt:mon?`Você já atua como monitor de ${disc(mon.discId).nome} neste semestre.`:cand?`Você já tem candidatura ativa em ${disc(edital(cand.editalId).discId).nome} neste semestre.`:'Sem monitoria ou candidatura ativa no semestre.'},
    {rn:car&&car.permanente?'RN15':'RN14',ok:!car,txt:!car?'Sem período de carência.':car.permanente?'Desligamento definitivo por infração grave: não é possível se candidatar.':`Em carência após desligamento até ${fmtY(car.ate)}.`}
  ];
  return {ok:checks.every(c=>c.ok),checks};
}
function horasExtras(monId,month=CUR_MONTH,soRealizadas=false){ /* RN20 / RN24 */
  const aulas=S.aulas.filter(a=>a.monId===monId&&a.tipo==='EXTRA'&&a.data.startsWith(month)&&(!soRealizadas||(a.data<=TODAY&&!a.falta))).reduce((s,a)=>s+a.duracao,0);
  const at=S.atendimentos.filter(a=>a.monId===monId&&a.data.startsWith(month)&&(soRealizadas?a.status==='CONCLUIDO':['ACEITO','CONCLUIDO'].includes(a.status))).length;
  return aulas+at;
}
function obrigatorias(monId,month){return S.aulas.filter(a=>a.monId===monId&&a.tipo==='OBRIGATORIA'&&a.modalidade==='PRESENCIAL'&&a.data.startsWith(month)&&a.data<=TODAY&&!a.falta).length}
function obrigExigidas(month){return month===CUR_MONTH?Math.max(1,Math.floor(+TODAY.slice(8)/7)):4}
function faltasMonitorSem(uid){return S.faltas.filter(f=>f.tipo==='monitor'&&f.userId===uid&&semOf(f.data)===SEM&&f.status!=='ACEITA')}
function bloqueioAluno(uid){ /* RN11 */
  const fs=S.faltas.filter(f=>f.tipo==='aluno'&&f.userId===uid&&f.status!=='ACEITA').sort((a,b)=>a.data<b.data?-1:1);
  const by={};let ate=null;
  fs.forEach(f=>{const m=f.data.slice(0,7);by[m]=(by[m]||0)+1;if(by[m]>=2){const fim=addDays(f.data,15);if(!ate||fim>ate)ate=fim}});
  return ate&&ate>=TODAY?ate:null;
}
function desligar(mon,motivo,detalhe,conselho=false){ /* RN12, RN13, RN14, RN15 */
  mon.status='DESLIGADA';const u=user(mon.alunoId);u.perfil='aluno';
  const perm=motivo==='INFRACAO_GRAVE';
  S.desligamentos.unshift({id:nid('dl'),monitoriaId:mon.id,userId:u.id,discId:mon.discId,motivo,detalhe,data:TODAY,carenciaAte:perm?null:addDays(TODAY,182),permanente:perm,conselho,statusEnc:conselho?'Encaminhado ao Conselho':'Efetivado'});
  S.atendimentos.filter(a=>a.monId===mon.id&&['PENDENTE','ACEITO'].includes(a.status)&&a.data>=TODAY).forEach(a=>{a.status='REJEITADO';a.motivo='Monitor desligado do programa';notify(a.alunoId,`Seu atendimento de ${fmt(a.data)} foi cancelado porque o monitor foi desligado.`)});
  notify(u.id,`Você foi desligado da monitoria de ${disc(mon.discId).nome}. Motivo: ${MOTIVO[motivo]}.`+(perm?' Caso encaminhado ao Conselho Disciplinar.':` Nova candidatura liberada em ${fmtY(addDays(TODAY,182))}.`));
  coordIds().forEach(c=>{if(c!==S.session)notify(c,`Desligamento de ${u.nome}: ${MOTIVO[motivo]}.`)});
  log(`Desligamento de ${u.nome} — ${MOTIVO[motivo]} (${MOTIVO_RN[motivo]})`);
}
function negativasConsecutivas(monId){ /* RN13: as duas últimas negativas decididas no semestre foram homologadas */
  const neg=S.avaliacoes.filter(a=>a.monId===monId&&a.tipo==='NEGATIVA'&&semOf(a.data)===SEM&&a.status!=='PENDENTE').sort((a,b)=>a.data<b.data?-1:a.data>b.data?1:0);
  const l=neg.slice(-2);return l.length===2&&l.every(a=>a.status==='HOMOLOGADA');
}
function historico(mat){ /* simula a consulta ao sistema acadêmico */
  let h=0;for(const c of mat)h=(h*31+c.charCodeAt(0))>>>0;
  const notas={};S.disciplinas.forEach((d,i)=>{const v=6.5+((h>>(i*4))%31)/10;notas[d.id]=Math.round(v*10)/10});return notas;
}

/* ================= dados de exemplo ================= */
async function seed(){
  const s={seq:1,session:null,users:[],disciplinas:[],editais:[],candidaturas:[],bancas:[],votos:[],monitorias:[],horarios:[],atendimentos:[],aulas:[],avaliacoes:[],faltas:[],desligamentos:[],questoes:[],simulados:[],bolsas:[],notifs:[],log:[]};
  S=s;
  const D=nome=>{const o={id:nid('d'),nome};s.disciplinas.push(o);return o.id};
  const ED=D('Estruturas de Dados'),CALC=D('Cálculo I'),BD=D('Banco de Dados I'),ALG=D('Algoritmos e Programação');
  const U=o=>{o.id=nid('u');o.notas=o.notas||{};s.users.push(o);return o.id};
  const EC='Engenharia de Computação',SI='Sistemas de Informação';
  const andre=U({nome:'André Nogueira',email:'andre.nogueira@uea.edu.br',perfil:'coordenacao'});
  const helena=U({nome:'Helena Costa',email:'helena.costa@uea.edu.br',perfil:'professor'});
  const marcos=U({nome:'Marcos Reis',email:'marcos.reis@uea.edu.br',perfil:'professor'});
  const joana=U({nome:'Joana Prado',email:'joana.prado@uea.edu.br',perfil:'professor'});
  const ricardo=U({nome:'Ricardo Alves',email:'ricardo.alves@uea.edu.br',perfil:'professor'});
  const bruna=U({nome:'Bruna Farias',email:'bruna.farias@aluno.uea.edu.br',perfil:'monitor',curso:EC,matricula:'2023001014',notas:{[ED]:9.5,[CALC]:8.1,[ALG]:9.0}});
  const diego=U({nome:'Diego Souza',email:'diego.souza@aluno.uea.edu.br',perfil:'monitor',curso:SI,matricula:'2023001027',notas:{[ED]:8.7,[ALG]:8.2}});
  const caio=U({nome:'Caio Menezes',email:'caio.menezes@aluno.uea.edu.br',perfil:'monitor',curso:EC,matricula:'2022001033',notas:{[CALC]:9.0,[ED]:7.9}});
  const ana=U({nome:'Ana Beatriz Lopes',email:'ana.lopes@aluno.uea.edu.br',perfil:'aluno',curso:EC,matricula:'2024001041',notas:{[ED]:9.2,[CALC]:7.0,[BD]:8.4,[ALG]:8.8}});
  const felipe=U({nome:'Felipe Rocha',email:'felipe.rocha@aluno.uea.edu.br',perfil:'aluno',curso:SI,matricula:'2024001058',notas:{[ED]:7.5,[CALC]:6.8,[ALG]:8.0}});
  const gabi=U({nome:'Gabriela Antunes',email:'gabriela.antunes@aluno.uea.edu.br',perfil:'aluno',curso:EC,matricula:'2024001062',notas:{[ED]:9.0,[CALC]:8.0}});
  const iara=U({nome:'Iara Moraes',email:'iara.moraes@aluno.uea.edu.br',perfil:'aluno',curso:SI,matricula:'2024001075',notas:{[ED]:8.3}});
  const lucas=U({nome:'Lucas Pinto',email:'lucas.pinto@aluno.uea.edu.br',perfil:'aluno',curso:EC,matricula:'2022001089',notas:{[ED]:9.1,[ALG]:9.4}});
  for(const u of s.users)u.senhaHash=await sha(u.email+':12345678');

  const E=o=>{o.id=nid('e');s.editais.push(o);return o.id};
  const eED=E({discId:ED,vagas:2,inicio:addDays(TODAY,-5),fim:addDays(TODAY,10),status:'PUBLICADO'});
  E({discId:CALC,vagas:1,inicio:addDays(TODAY,-30),fim:addDays(TODAY,-15),status:'PUBLICADO'});
  E({discId:ALG,vagas:1,inicio:addDays(TODAY,-2),fim:addDays(TODAY,12),status:'PUBLICADO'});
  E({discId:BD,vagas:2,inicio:addDays(TODAY,3),fim:addDays(TODAY,18),status:'RASCUNHO'});

  const sl1=nid('sl'),sl2=nid('sl');
  s.bancas.push({id:nid('b'),discId:ED,profs:[helena,marcos,joana],slots:[
    {id:sl1,data:addDays(TODAY,-3),hora:'10:00'},{id:sl2,data:addDays(TODAY,-3),hora:'14:00'},
    {id:nid('sl'),data:addDays(TODAY,4),hora:'10:00'},{id:nid('sl'),data:addDays(TODAY,5),hora:'14:00'}]});
  const cG=nid('c'),cI=nid('c');
  s.candidaturas.push({id:cG,alunoId:gabi,editalId:eED,nota:9.0,semestre:SEM,data:addDays(TODAY,-4),status:'EM_AVALIACAO',slotId:sl1});
  s.candidaturas.push({id:cI,alunoId:iara,editalId:eED,nota:8.3,semestre:SEM,data:addDays(TODAY,-4),status:'EM_AVALIACAO',slotId:sl2});
  s.bancas[0].slots[0].candId=cG;s.bancas[0].slots[1].candId=cI;
  s.votos.push({candId:cG,profId:helena,voto:'APROVADO',parecer:'Didática clara e bom domínio de árvores binárias.'});
  s.votos.push({candId:cG,profId:marcos,voto:'APROVADO',parecer:'Conduziu bem o exemplo de pilha com chamadas recursivas.'});

  const M=o=>{o.id=nid('m');s.monitorias.push(o);return o.id};
  const mB=M({alunoId:bruna,discId:ED,semestre:SEM,status:'ATIVA',area:'Árvores e grafos',editalId:null});
  const mD=M({alunoId:diego,discId:ED,semestre:SEM,status:'ATIVA',area:'Listas, pilhas e filas',editalId:null});
  const mC=M({alunoId:caio,discId:CALC,semestre:SEM,status:'ATIVA',area:'Limites e derivadas',editalId:null});
  const mL=M({alunoId:lucas,discId:ALG,semestre:'anterior',status:'DESLIGADA',area:'Recursão',editalId:null});
  s.desligamentos.push({id:nid('dl'),monitoriaId:mL,userId:lucas,discId:ALG,motivo:'FALTA_RECORRENTE',detalhe:'Ausência em duas aulas coletivas obrigatórias.',data:addDays(TODAY,-120),carenciaAte:addDays(TODAY,62),permanente:false,conselho:false,statusEnc:'Efetivado'});

  const H=(monId,dia,hora,modalidade)=>{const o={id:nid('h'),monId,dia,hora,modalidade};s.horarios.push(o);return o};
  const hB1=H(mB,'SEG','08:00','PRESENCIAL'),hB2=H(mB,'TER','14:00','PRESENCIAL'),hB3=H(mB,'QUI','16:00','REMOTO');
  const hD1=H(mD,'QUA','10:00','PRESENCIAL');H(mD,'SEX','14:00','REMOTO');
  const hC1=H(mC,'SEG','16:00','PRESENCIAL');H(mC,'QUI','08:00','PRESENCIAL');

  const A=o=>{o.id=nid('a');o.formato=o.formato||'INDIVIDUAL';o.criadoEm=o.criadoEm||o.data;s.atendimentos.push(o);return o.id};
  A({alunoId:ana,monId:mB,dia:hB2.dia,hora:hB2.hora,modalidade:'PRESENCIAL',data:inMonth(13),assunto:'Rotações em árvores AVL',status:'CONCLUIDO'});
  A({alunoId:ana,monId:mB,dia:hB3.dia,hora:hB3.hora,modalidade:'REMOTO',data:nextDate('QUI'),assunto:'Dúvidas sobre balanceamento AVL antes da prova',status:'PENDENTE'});
  A({alunoId:felipe,monId:mB,dia:hB1.dia,hora:hB1.hora,modalidade:'PRESENCIAL',data:nextDate('SEG'),assunto:'Revisão de listas encadeadas',status:'PENDENTE'});
  const a6=A({alunoId:gabi,monId:mB,dia:hB2.dia,hora:hB2.hora,modalidade:'PRESENCIAL',data:inMonth(6),assunto:'Busca em largura',status:'CONCLUIDO'});
  A({alunoId:felipe,monId:mB,dia:hB1.dia,hora:hB1.hora,modalidade:'PRESENCIAL',data:inMonth(1),assunto:'Pilhas e notação pós-fixa',status:'ACEITO'});
  const a5=A({alunoId:gabi,monId:mD,dia:hD1.dia,hora:hD1.hora,modalidade:'PRESENCIAL',data:inMonth(4),assunto:'Filas circulares',status:'CONCLUIDO'});
  const a8=A({alunoId:felipe,monId:mD,dia:hD1.dia,hora:hD1.hora,modalidade:'PRESENCIAL',data:inMonth(18),assunto:'Implementação de pilha com vetor',status:'CONCLUIDO'});
  const a7=A({alunoId:felipe,monId:mC,dia:hC1.dia,hora:hC1.hora,modalidade:'PRESENCIAL',data:inMonth(9),assunto:'Regra da cadeia',status:'FALTA_ALUNO'});

  const AU=o=>{o.id=nid('au');s.aulas.push(o)};
  [[mB,[0,1,2,3,4]],[mD,[0,2,3,4]],[mC,[0,1,2,3,4]]].forEach(([m,ks])=>{
    ks.forEach(k=>AU({monId:m,data:addDays(TODAY,-1-7*k),hora:'16:00',duracao:2,modalidade:'PRESENCIAL',local:'Sala 12 — Bloco C',tipo:'OBRIGATORIA'}));
    AU({monId:m,data:addDays(TODAY,6),hora:'16:00',duracao:2,modalidade:'PRESENCIAL',local:'Sala 12 — Bloco C',tipo:'OBRIGATORIA'});
  });
  AU({monId:mB,data:inMonth(10),hora:'18:00',duracao:2,modalidade:'REMOTO',local:'meet.google.com/sgm-ed-revisao',tipo:'EXTRA'});
  AU({monId:mB,data:inMonth(3),hora:'18:00',duracao:1,modalidade:'REMOTO',local:'meet.google.com/sgm-ed-avl',tipo:'EXTRA'});
  AU({monId:mD,data:inMonth(15),hora:'19:00',duracao:4,modalidade:'PRESENCIAL',local:'Laboratório 3',tipo:'EXTRA'});
  AU({monId:mD,data:inMonth(8),hora:'19:00',duracao:4,modalidade:'REMOTO',local:'meet.google.com/sgm-ed-listas',tipo:'EXTRA'});

  s.avaliacoes.push({id:nid('av'),atendId:a6,monId:mB,alunoId:gabi,tipo:'POSITIVA',justificativa:'',defesa:'',status:'—',data:inMonth(6)});
  s.avaliacoes.push({id:nid('av'),atendId:a8,monId:mD,alunoId:felipe,tipo:'NEGATIVA',justificativa:'O monitor chegou 25 minutos atrasado e encerrou antes do horário.',defesa:'Tive um imprevisto com o transporte e avisei no grupo da turma.',status:'HOMOLOGADA',data:inMonth(18)});
  s.avaliacoes.push({id:nid('av'),atendId:a5,monId:mD,alunoId:gabi,tipo:'NEGATIVA',justificativa:'Não explicou o conteúdo combinado; passou o tempo resolvendo outra lista.',defesa:'',status:'PENDENTE',data:inMonth(4)});

  s.faltas.push({id:nid('f'),tipo:'monitor',userId:caio,monId:mC,data:addDays(TODAY,-11),ref:'Aula coletiva obrigatória',status:'INJUSTIFICADA',justificativa:''});
  s.faltas.push({id:nid('f'),tipo:'aluno',userId:felipe,monId:mC,atendId:a7,data:inMonth(9),ref:'Atendimento individual — Cálculo I',status:'INJUSTIFICADA',justificativa:''});

  const Q=(discId,autorId,enun,alts,gab,status)=>s.questoes.push({id:nid('q'),discId,autorId,enunciado:enun,alts,gabarito:gab,status,data:addDays(TODAY,-20)});
  Q(ED,helena,'Em uma pilha, qual operação remove o elemento do topo?',['push','pop','enqueue','insert'],'B','APROVADA');
  Q(ED,helena,'Qual é a complexidade da busca em uma árvore AVL com n nós, no pior caso?',['O(n)','O(log n)','O(n log n)','O(1)'],'B','APROVADA');
  Q(ED,marcos,'Qual estrutura de dados segue a política FIFO?',['Pilha','Fila','Árvore binária','Grafo'],'B','APROVADA');
  Q(ED,helena,'Em uma lista simplesmente encadeada, inserir um elemento no início custa:',['O(1)','O(n)','O(log n)','O(n²)'],'A','APROVADA');
  Q(ED,joana,'O percurso em ordem (in-order) de uma árvore binária de busca retorna as chaves:',['Em ordem crescente','Na ordem de inserção','Nível a nível','Em ordem decrescente'],'A','APROVADA');
  Q(ED,marcos,'Quais valores de fator de balanceamento são permitidos em um nó de árvore AVL?',['−1, 0 e 1','Somente 0','De −2 a 2','Qualquer valor'],'A','APROVADA');
  Q(ED,bruna,'A busca em largura (BFS) em um grafo utiliza qual estrutura auxiliar?',['Pilha','Fila','Heap','Tabela hash'],'B','PENDENTE');
  Q(CALC,ricardo,'Qual é a derivada de f(x) = x²?',['x','2x','x²/2','2'],'B','APROVADA');
  Q(CALC,ricardo,'Quanto vale o limite de sen(x)/x quando x tende a 0?',['0','1','∞','Não existe'],'B','APROVADA');
  Q(CALC,caio,'Qual é a derivada de f(x) = eˣ?',['eˣ','x·eˣ⁻¹','ln x','1'],'A','APROVADA');

  s.notifs.push({id:nid('n'),userId:andre,msg:'Nova avaliação negativa de Diego Souza aguardando apuração.',ts:new Date(Date.now()-36e5*20).toISOString(),lida:false});
  s.notifs.push({id:nid('n'),userId:bruna,msg:'Nova solicitação de atendimento de Ana Beatriz Lopes.',ts:new Date(Date.now()-36e5*5).toISOString(),lida:false});
  s.notifs.push({id:nid('n'),userId:caio,msg:'Advertência registrada: 1ª falta não justificada no semestre.',ts:new Date(Date.now()-36e5*24*11).toISOString(),lida:true});
  s.log.push({ts:new Date(Date.now()-36e5*20).toISOString(),userId:felipe,acao:'Avaliação negativa registrada para monitoria de Estruturas de Dados'});
  s.log.push({ts:new Date(Date.now()-36e5*24*4).toISOString(),userId:andre,acao:'Edital de Estruturas de Dados publicado (2 vagas)'});
  s.log.push({ts:new Date(Date.now()-36e5*24*11).toISOString(),userId:andre,acao:'Falta não justificada registrada para Caio Menezes'});
  return s;
}

/* ================= navegação ================= */
const ALUNO_ITEMS=[['agendar','Agendar atendimento','UC07'],['atendimentos','Meus atendimentos','UC08'],['simulado','Simulado','UC10']];
const NAV={
  aluno:[{g:'Processo seletivo',items:[['editais','Editais','UC05'],['candidaturas','Minhas candidaturas','UC03']]},{g:'Monitoria',items:ALUNO_ITEMS}],
  monitor:[{g:'Atividades do monitor',items:[['painel','Painel','UC14'],['horarios','Horários','UC11'],['solicitacoes','Solicitações','UC12'],['aulas','Aulas coletivas','UC15'],['questoes','Banco de questões','UC22']]},{g:'Como aluno',items:ALUNO_ITEMS}],
  professor:[{g:'Banca e questões',items:[['avaliar','Avaliar candidatos','UC06'],['validar','Validar questões','UC22'],['questoes','Banco de questões','UC22']]}],
  coordenacao:[{g:'Gestão',items:[['visao','Visão geral',''],['editais_c','Editais','UC16'],['bancas','Bancas','UC17'],['perfis','Perfis','UC19']]},{g:'Qualidade',items:[['apurar','Apurar negativas','UC18'],['relatorios','Relatórios e bolsa','UC20'],['desligamentos','Desligamentos e faltas','UC21']]}]
};
function badge(route,u){
  if(route==='solicitacoes'){const m=monOf(u.id);return m?S.atendimentos.filter(a=>a.monId===m.id&&a.status==='PENDENTE').length:0}
  if(route==='apurar')return S.avaliacoes.filter(a=>a.tipo==='NEGATIVA'&&a.status==='PENDENTE').length;
  if(route==='validar')return S.questoes.filter(q=>q.status==='PENDENTE').length;
  if(route==='avaliar')return candidatosDoProf(u.id).filter(c=>!S.votos.some(v=>v.candId===c.id&&v.profId===u.id)).length;
  if(route==='atendimentos')return S.atendimentos.filter(a=>a.alunoId===u.id&&a.status==='CONCLUIDO'&&!S.avaliacoes.some(v=>v.atendId===a.id)).length;
  return 0;
}

/* ================= tela de acesso ================= */
const DEMO=[
  ['andre.nogueira@uea.edu.br','André Nogueira','Coordenação','Editais, bancas, apuração e bolsa'],
  ['joana.prado@uea.edu.br','Joana Prado','Professora','Falta o 3º voto da banca de Gabriela'],
  ['bruna.farias@aluno.uea.edu.br','Bruna Farias','Monitora · ED','2 solicitações pendentes · 6h extras'],
  ['diego.souza@aluno.uea.edu.br','Diego Souza','Monitor · ED','10h/10h extras · negativa em apuração'],
  ['caio.menezes@aluno.uea.edu.br','Caio Menezes','Monitor · Cálculo I','1 falta não justificada (advertência)'],
  ['ana.lopes@aluno.uea.edu.br','Ana Beatriz Lopes','Aluna','Elegível em ED · atendimento a avaliar'],
  ['felipe.rocha@aluno.uea.edu.br','Felipe Rocha','Aluno','Nota 7,5 em ED (inelegível)'],
  ['lucas.pinto@aluno.uea.edu.br','Lucas Pinto','Aluno','Em carência após desligamento']
];
const CTS=[['CT01–02','Cadastro válido e inválido','Criar conta'],['CT03–04','Login correto e incorreto','Qualquer conta / senha errada'],['CT05','Publicar edital','André › Editais'],['CT06','Candidatura elegível','Ana › Editais › Estruturas de Dados'],['CT07','Candidatura inelegível','Felipe (nota 7,5) ou Lucas (carência)'],['CT08','Cadastrar banca com 3 professores','André › Bancas'],['CT09','Consolidar os 3 votos','Joana › Avaliar candidatos'],['CT10–11','Aceitar e rejeitar atendimento','Bruna › Solicitações'],['CT12','Bloqueio de aula extra (10h)','Diego › Aulas coletivas'],['CT13','Negativa sem justificativa','Ana › Meus atendimentos'],['CT14','2ª negativa homologada','André › Apurar negativas'],['CT15','Questão de monitor fica pendente','Bruna › Banco de questões'],['CT16','Simulado com questões aprovadas','Ana › Simulado'],['CT17','Cadastrar aula coletiva','Bruna › Aulas coletivas'],['CT18','2ª falta do monitor','André › Desligamentos e faltas (Caio)'],['CT19','Aluno → Monitor','André › Perfis (Gabriela, após CT09)'],['CT20','Alteração sem aprovação','André › Perfis (Iara)']];
function viewAuth(){
  const cursos=['Engenharia de Computação','Sistemas de Informação','Ciência da Computação','Licenciatura em Computação'];
  const form=ui.authMode==='login'?`
    <form data-form="login" novalidate>
      <div><p class="eyebrow muted">Acesso</p><h1>Entrar no sistema</h1></div>
      ${fld('E-mail institucional','email','<input name="email" id="l-email" type="email" autocomplete="username" placeholder="nome@aluno.uea.edu.br">')}
      ${fld('Senha','senha','<input name="senha" id="l-senha" type="password" autocomplete="current-password" placeholder="8 caracteres">')}
      <div class="formerr" data-err="geral"></div>
      <button class="btn pri" type="submit">Entrar</button>
      <p class="switch muted">Ainda não tem conta? <button type="button" class="link" data-act="authMode" data-v="cadastro">Criar conta de aluno</button></p>
      <p class="note">${rn('RN2')} O acesso usa o e-mail institucional e a senha cadastrada. O sistema identifica o perfil e abre as funções correspondentes.</p>
    </form>`:`
    <form data-form="cadastro" novalidate>
      <div><p class="eyebrow muted">Novo por aqui</p><h1>Criar conta de aluno</h1></div>
      ${fld('Nome completo','nome','<input name="nome" id="c-nome" autocomplete="name">')}
      ${fld('Curso','curso',`<select name="curso" id="c-curso"><option value="">Selecionar</option>${cursos.map(c=>`<option>${c}</option>`).join('')}</select>`)}
      ${fld('Matrícula','matricula','<input name="matricula" id="c-mat" inputmode="numeric" placeholder="10 dígitos">')}
      ${fld('E-mail institucional','email','<input name="email" id="c-email" type="email" placeholder="nome@aluno.uea.edu.br">')}
      <div class="grid2">
        ${fld('Senha','senha','<input name="senha" id="c-senha" type="password" autocomplete="new-password" placeholder="8 caracteres">')}
        ${fld('Confirmar senha','confirma','<input name="confirma" id="c-conf" type="password" autocomplete="new-password" placeholder="8 caracteres">')}
      </div>
      <button class="btn pri" type="submit">Cadastrar</button>
      <p class="switch muted">Já tem conta? <button type="button" class="link" data-act="authMode" data-v="login">Entrar</button></p>
      <p class="note">${rn('RN1')} Nome, curso, matrícula, e-mail institucional e senha de 8 caracteres. </p>
    </form>`;
  return `<div class="auth">
    <section class="auth-brand">
      <div class="wordmark">SISGEM<small>Sistema de Gestão de Monitoria</small></div>
      <p>Processo seletivo, agendamento de atendimentos, controle de frequência, avaliações e bolsa do Programa de Monitoria dos cursos de Computação.</p>
      <div style="display:flex;flex-direction:column;gap:10px;position:relative;z-index:1">
        <p class="eyebrow">Acesso rápido · protótipo (senha 12345678)</p>
        <div class="demo">${DEMO.map(d=>`<button data-act="demo" data-email="${d[0]}"><span class="role">${d[2]}</span><b>${d[1]}</b><span>${d[3]}</span></button>`).join('')}</div>
      </div>
    </section>
    <section class="auth-card">${form}</section>
  </div>`;
}

/* ================= shell ================= */
function shell(u,nav,content){
  const unread=S.notifs.filter(n=>n.userId===u.id&&!n.lida).length;
  return `<header class="top">
      <button class="menubtn" data-act="menu" aria-label="Abrir menu" aria-expanded="${ui.menu?'true':'false'}"><span></span></button>
      <div class="brand"><i></i>SISGEM <small>Sistema de Gestão de Monitoria</small></div>
      <div class="sp"></div>
      <div class="who"><b>${esc(u.nome)}</b><span>${PERFIL[u.perfil]}${u.perfil==='monitor'?' · '+esc(disc(monOf(u.id)?.discId).nome):''}</span></div>
      <button class="ibtn" data-act="go" data-r="notifs" aria-label="Notificações">Avisos${unread?`<span class="dot">${unread}</span>`:''}</button>
      <button class="ibtn" data-act="logout">Sair</button>
    </header>
    <div class="layout ${ui.menu?'menu-aberto':''}">
      <div class="side-bg" data-act="menu"></div>
      <nav class="side" aria-label="Menu">
        <div class="side-me"><b>${esc(u.nome)}</b><span>${PERFIL[u.perfil]}${u.perfil==='monitor'?' · '+esc(disc(monOf(u.id)?.discId).nome):''}</span></div>
        ${nav.map(g=>`<div class="g"><div class="gl">${g.g}</div>${g.items.map(([r,l,uc])=>{const b=badge(r,u);return `<button class="nav ${ui.route===r?'on':''}" data-act="go" data-r="${r}">${l}${b?`<span class="badge">${b}</span>`:''}</button>`}).join('')}</div>`).join('')}
        <div class="foot"><span>Semestre ${SEM} · hoje ${fmtY(TODAY)}</span><span>Dados de exemplo salvos só neste navegador.</span><button class="link" data-act="reset">Restaurar dados de exemplo</button></div>
      </nav>
      <main class="main"><div class="wrap">${content}</div></main>
    </div>`;
}
function modalHtml(){
  if(!ui.modal)return '';const m=ui.modal;
  return `<div class="modal-bg" data-act="modalClose"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt" data-stop>
    <h2 id="mt">${m.title}</h2><div>${m.body}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-act="modalClose">Cancelar</button><button class="btn ${m.danger?'bad':'pri'}" data-act="modalOk" id="modal-ok">${m.label}</button></div>
  </div></div>`;
}

/* ================= views: aluno ================= */
const V={};
V.editais=()=>{
  const u=me();const eds=S.editais.filter(e=>e.status!=='RASCUNHO').sort((a,b)=>edStatus(a)==='ABERTO'?-1:1);
  const abertos=eds.filter(e=>edStatus(e)==='ABERTO');
  return ph('UC05 · Consultar edital','Editais de monitoria','Editais publicados pela Coordenação. A candidatura só é possível dentro do período de cada edital.')+
  (abertos.length?'':`<div class="alert warn">Nenhum edital com inscrições abertas no momento.</div>`)+
  `<div class="tw"><table class="t"><thead><tr><th>Disciplina</th><th>Vagas</th><th>Período de candidatura</th><th>Status</th><th></th></tr></thead><tbody>
  ${eds.map(e=>`<tr><td><b>${esc(disc(e.discId).nome)}</b></td><td class="num">${e.vagas}</td><td class="num">${fmt(e.inicio)} a ${fmt(e.fim)}</td><td>${pill(edStatus(e))}</td>
   <td class="act">${edStatus(e)==='ABERTO'?`<button class="btn sm pri" data-act="go" data-r="candidatar" data-p="${e.id}">Ver e candidatar-se</button>`:`<button class="btn sm" data-act="go" data-r="candidatar" data-p="${e.id}">Ver edital</button>`}</td></tr>`).join('')}
  </tbody></table></div><p class="note">${rn('RN4')} candidatura dentro do período do edital · ${rn('RN8')} número de vagas por disciplina definido no edital.</p>`;
};
V.candidatar=()=>{
  const u=me();const e=edital(ui.param);if(!e)return empty('Edital não encontrado.');
  const el=elegibilidade(u,e);
  return ph('UC03 · Candidatar a monitor',`Candidatura — ${esc(disc(e.discId).nome)}`,'Confira se você atende aos requisitos antes de confirmar.')+
  `<div class="cols"><div class="card"><h2>Informações do edital</h2>
    <div class="tw"><table class="t"><tbody>
      <tr><td class="muted">Disciplina</td><td><b>${esc(disc(e.discId).nome)}</b></td></tr>
      <tr><td class="muted">Vagas</td><td class="num">${e.vagas}</td></tr>
      <tr><td class="muted">Período</td><td class="num">${fmtY(e.inicio)} a ${fmtY(e.fim)}</td></tr>
      <tr><td class="muted">Requisitos</td><td>Disciplina já cursada · nota final ≥ 8,0 · uma monitoria por semestre</td></tr>
      <tr><td class="muted">Etapa seguinte</td><td>Apresentação de aula para banca de 3 professores ${rn('RN5')}</td></tr>
    </tbody></table></div></div>
    <div class="card"><header><h2>Elegibilidade</h2>${el.ok?pill('APROVADA','Critérios atendidos'):pill('REPROVADO','Não elegível')}</header>
      <ul class="checks">${el.checks.map(c=>`<li><span class="mk ${c.ok?'y':'n'}">${c.ok?'✓':'✕'}</span><span>${esc(c.txt)} ${rn(c.rn)}</span></li>`).join('')}</ul>
      ${el.ok?`<div class="alert ok">Você atende aos critérios. Confirme para registrar a candidatura.</div>`:`<div class="alert bad">Candidatura bloqueada pelos critérios acima.</div>`}
      <div class="row">${el.ok?`<button class="btn pri" data-act="candidatar" data-id="${e.id}">Confirmar candidatura</button>`:''}<button class="btn" data-act="go" data-r="editais">Voltar aos editais</button></div>
    </div></div>`;
};
V.candidaturas=()=>{
  const u=me();const cs=S.candidaturas.filter(c=>c.alunoId===u.id);
  if(!cs.length)return ph('UC03 · UC14','Minhas candidaturas')+empty(`Você ainda não se candidatou. <button class="link" data-act="go" data-r="editais">Ver editais abertos</button>`);
  return ph('UC03 · UC14','Minhas candidaturas','Acompanhe o processo seletivo e escolha o horário da sua apresentação para a banca.')+cs.map(c=>{
    const e=edital(c.editalId);const b=S.bancas.find(x=>x.discId===e.discId);const nv=S.votos.filter(v=>v.candId===c.id).length;
    const slot=b&&b.slots.find(s=>s.id===c.slotId);
    let banca='';
    if(c.status==='EM_AVALIACAO'){
      if(slot)banca=`<p>Apresentação marcada para <b>${fmtY(slot.data)} às ${slot.hora}</b> · ${nv} de 3 avaliações registradas.</p>`;
      else if(!b||!b.slots.some(s=>!s.candId&&s.data>=TODAY))banca=`<div class="alert warn">Não há horários disponíveis para a apresentação. Aguarde a Coordenação cadastrar novos horários.</div>`;
      else banca=`<h3>Escolha o horário da sua apresentação</h3><div class="tw"><table class="t"><tbody>${b.slots.filter(s=>!s.candId&&s.data>=TODAY).map(s=>`<tr><td class="num"><b>${fmtY(s.data)}</b> · ${s.hora}</td><td class="muted">Banca: ${b.profs.map(p=>esc(user(p).nome)).join(', ')}</td><td class="act"><button class="btn sm pri" data-act="slot" data-c="${c.id}" data-s="${s.id}">Selecionar</button></td></tr>`).join('')}</tbody></table></div>`;
    }
    return `<div class="card"><header><h2>${esc(disc(e.discId).nome)}</h2>${pill(c.status)}</header>
      <p class="muted">Candidatura em ${fmtY(c.data)} · nota final ${nota(c.nota)} · semestre ${c.semestre}</p>${banca}
      ${c.status==='APROVADO'?`<div class="alert ok">Aprovado pela banca. A Coordenação vai autorizar a mudança do seu perfil para Monitor ${rn('RN6')}.</div>`:''}
      ${c.status==='REPROVADO'?`<div class="alert bad">A banca não aprovou a candidatura neste processo seletivo.</div>`:''}
    </div>`}).join('');
};
V.agendar=()=>{
  const u=me();const bloq=bloqueioAluno(u.id);
  const discs=S.disciplinas.filter(d=>S.monitorias.some(m=>m.discId===d.id&&m.status==='ATIVA'&&m.alunoId!==u.id));
  if(!ui.agDisc||!discs.some(d=>d.id===ui.agDisc))ui.agDisc=discs[0]?.id;
  const mons=S.monitorias.filter(m=>m.discId===ui.agDisc&&m.status==='ATIVA'&&m.alunoId!==u.id);
  if(!mons.some(m=>m.id===ui.agMon))ui.agMon=mons[0]?.id;
  const mon=monById(ui.agMon);const hs=mon?S.horarios.filter(h=>h.monId===mon.id):[];
  const horas=[...new Set(hs.map(h=>h.hora))].sort();
  const busy=h=>{const d=nextDate(h.dia);return S.atendimentos.some(a=>a.monId===h.monId&&a.data===d&&a.hora===h.hora&&['PENDENTE','ACEITO'].includes(a.status))};
  const sel=S.horarios.find(h=>h.id===ui.agSlot&&h.monId===ui.agMon);
  const lim=mon&&horasExtras(mon.id,sel?nextDate(sel.dia).slice(0,7):CUR_MONTH)>=LIMITE_EXTRA;
  const avs=m=>{const a=S.avaliacoes.filter(v=>v.monId===m.id&&(v.tipo==='POSITIVA'||v.status==='HOMOLOGADA'));return a.length?`${a.filter(v=>v.tipo==='POSITIVA').length} de ${a.length} avaliações positivas`:'Sem avaliações ainda'};
  return ph('UC07 · Agendar atendimento','Agendar atendimento','Escolha a disciplina, o monitor e um horário livre. O monitor confirma ou recusa a solicitação.')+
  (bloq?`<div class="alert bad">Agendamentos individuais bloqueados até ${fmtY(bloq)} por duas faltas não justificadas no mês ${rn('RN11')}.</div>`:'')+
  `<div class="card">${fld('Disciplina','agDisc',`<select id="ag-disc" data-change="agDisc">${discs.map(d=>`<option value="${d.id}" ${d.id===ui.agDisc?'selected':''}>${esc(d.nome)}</option>`).join('')}</select>`)}
   <h3>Monitores disponíveis ${rn('RN16')} ${rn('RN17')}</h3>
   ${mons.length?`<div class="mons">${mons.map(m=>`<button class="mon ${m.id===ui.agMon?'on':''}" data-act="agMon" data-id="${m.id}"><b>${esc(user(m.alunoId).nome)}</b><span>Área de domínio: ${esc(m.area)}</span><span>${avs(m)}</span></button>`).join('')}</div>`:empty('Nenhum monitor ativo nesta disciplina.')}
  </div>`+
  (mon?`<div class="card"><header><h2>Horários de ${esc(user(mon.alunoId).nome)}</h2><span class="muted">Próxima semana</span></header>
   ${hs.length?`<div class="tw tw-grade"><table class="t grade"><thead><tr><th></th>${DIAS.map(d=>`<th>${DIA_NOME[d]}</th>`).join('')}</tr></thead><tbody>
   ${horas.map(hr=>`<tr><td>${hr}</td>${DIAS.map(d=>{const h=hs.find(x=>x.dia===d&&x.hora===hr);if(!h)return '<td class="muted">—</td>';const b=busy(h);return `<td><button class="slot ${b?'busy':''} ${ui.agSlot===h.id?'on':''}" ${b?'disabled':''} data-act="agSlot" data-id="${h.id}" title="${h.modalidade==='REMOTO'?'Remoto':'Presencial'}">${b?'Ocupado':fmt(nextDate(d))+' · '+(h.modalidade==='REMOTO'?'Rem.':'Pres.')}</button></td>`}).join('')}</tr>`).join('')}
   </tbody></table></div>
   <div class="slot-list">${hs.slice().sort((a,b)=>DIAS.indexOf(a.dia)-DIAS.indexOf(b.dia)||a.hora.localeCompare(b.hora)).map(h=>{const b=busy(h);return `<button class="slot-item ${ui.agSlot===h.id?'on':''}" ${b?'disabled':''} data-act="agSlot" data-id="${h.id}"><b>${DIA_NOME[h.dia]}, ${fmt(nextDate(h.dia))}</b><span>${h.hora} · ${h.modalidade==='REMOTO'?'Remoto':'Presencial'}</span><em>${b?'Ocupado':ui.agSlot===h.id?'Selecionado':'Livre'}</em></button>`}).join('')}</div>`:empty('Este monitor ainda não cadastrou horários.')}
   ${lim?`<div class="alert warn">${esc(user(mon.alunoId).nome)} atingiu o limite de 10 horas extras no mês ${rn('RN20')}. Escolha outro monitor ou aguarde o mês seguinte.</div>`:''}
   <form data-form="agendar" novalidate style="display:flex;flex-direction:column;gap:12px">
     <div class="grid2">
       <div class="fld"><span>Modalidade ${rn('RN9')}</span><div class="radios"><label><input type="radio" name="modalidade" value="PRESENCIAL" ${!sel||sel.modalidade==='PRESENCIAL'?'checked':''}>Presencial</label><label><input type="radio" name="modalidade" value="REMOTO" ${sel&&sel.modalidade==='REMOTO'?'checked':''}>Remoto (Google Meet)</label></div></div>
       <div class="fld"><span>Formato</span><div class="radios"><label><input type="radio" name="formato" value="INDIVIDUAL" checked>Individual</label><label><input type="radio" name="formato" value="COLETIVO">Coletivo</label></div></div>
     </div>
     ${fld('Assunto ou dúvida','assunto','<textarea name="assunto" id="ag-assunto" placeholder="Ex.: dúvidas sobre rotações em árvores AVL"></textarea>')}
     <p class="muted">${sel?`Horário escolhido: <b>${DIA_NOME[sel.dia]}, ${fmtY(nextDate(sel.dia))} às ${sel.hora}</b>`:'Selecione um horário livre.'} · tolerância de 15 minutos de atraso ${rn('RN10')}</p>
     <div><button class="btn pri" type="submit" ${bloq||lim||!sel?'disabled':''}>Enviar solicitação</button></div>
   </form></div>`:'');
};
V.atendimentos=()=>{
  const u=me();const ats=S.atendimentos.filter(a=>a.alunoId===u.id).sort((a,b)=>a.data<b.data?1:-1);
  const bloq=bloqueioAluno(u.id);const fs=S.faltas.filter(f=>f.tipo==='aluno'&&f.userId===u.id);
  const at=S.atendimentos.find(a=>a.id===ui.avalAt);
  return ph('UC08 · UC09','Meus atendimentos','Histórico das suas solicitações. Atendimentos concluídos podem ser avaliados; sua identidade fica anônima para o monitor.')+
  (bloq?`<div class="alert bad">Agendamentos individuais bloqueados até ${fmtY(bloq)} ${rn('RN11')}.</div>`:'')+
  (ats.length?`<div class="tw"><table class="t"><thead><tr><th>Data</th><th>Monitor</th><th>Disciplina</th><th>Assunto</th><th>Status</th><th></th></tr></thead><tbody>
  ${ats.map(a=>{const m=monById(a.monId);const av=S.avaliacoes.find(v=>v.atendId===a.id);
    return `<tr class="${ui.avalAt===a.id?'sel':''}"><td class="num">${fmt(a.data)} ${a.hora}</td><td>${esc(user(m.alunoId).nome)}</td><td>${esc(disc(m.discId).nome)}</td><td>${esc(a.assunto)}${a.status==='REJEITADO'?`<br><span class="muted">Motivo: ${esc(a.motivo)}</span>`:''}</td><td>${pill(a.status)}</td>
    <td class="act">${a.status==='CONCLUIDO'?(av?`<span class="muted">Avaliado: ${av.tipo==='POSITIVA'?'positiva':'negativa'}</span>`:`<button class="btn sm pri" data-act="avalAt" data-id="${a.id}">Avaliar</button>`):''}</td></tr>`}).join('')}
  </tbody></table></div>`:empty(`Nenhum atendimento ainda. <button class="link" data-act="go" data-r="agendar">Agendar atendimento</button>`))+
  (at?`<form class="card" data-form="avaliar" novalidate>
    <header><h2>Avaliação — ${esc(monNome(at.monId))}, ${fmtY(at.data)}</h2><span class="muted">${esc(at.assunto)}</span></header>
    <div class="radios"><label><input type="radio" name="tipo" value="POSITIVA" checked data-change="avalTipo">Positiva</label><label><input type="radio" name="tipo" value="NEGATIVA" data-change="avalTipo">Negativa</label></div>
    ${fld('Justificativa (obrigatória para avaliação negativa)','justificativa','<textarea name="justificativa" id="av-just" placeholder="Descreva o que aconteceu no atendimento"></textarea>')}
    <p class="note">${rn('RNF006')} o monitor não vê sua identidade. ${rn('RN13')} a avaliação negativa segue para apuração da Coordenação; duas negativas consecutivas homologadas desligam o monitor.</p>
    <div class="row"><button class="btn pri" type="submit">Registrar avaliação</button><button class="btn" type="button" data-act="avalAt" data-id="">Cancelar</button></div>
  </form>`:'')+
  (fs.length?`<div class="card"><h2>Minhas faltas</h2>${faltasTable(fs,true)}<p class="note">Justificativas com comprovante são aceitas em até 48h ${rn('RN10')} ${rn('RN11')}.</p></div>`:'');
};
function faltasTable(fs,canJustify){
  return `<div class="tw"><table class="t"><thead><tr><th>Data</th><th>Referência</th><th>Situação</th><th></th></tr></thead><tbody>${fs.map(f=>{
    const prazo=daysBetween(f.data,TODAY)<=2;
    return `<tr><td class="num">${fmtY(f.data)}</td><td>${esc(f.ref)}${f.justificativa?`<br><span class="muted">Justificativa: ${esc(f.justificativa)}</span>`:''}</td><td>${pill(f.status)}</td>
    <td class="act">${canJustify&&f.status==='INJUSTIFICADA'?(prazo?`<button class="btn sm" data-act="justFalta" data-id="${f.id}">Enviar justificativa</button>`:'<span class="muted">Prazo de 48h encerrado</span>'):''}</td></tr>`}).join('')}</tbody></table></div>`;
}
V.simulado=()=>{
  const u=me();const sim=ui.sim;
  const discs=S.disciplinas;
  const hist=S.simulados.filter(s=>s.alunoId===u.id).slice(0,5);
  if(sim&&!sim.done){
    const q=S.questoes.find(x=>x.id===sim.qids[sim.idx]);
    return ph('UC10 · Simulado de autoavaliação',esc(disc(sim.discId).nome))+`<div class="card q">
      <header><span class="muted">Questão ${sim.idx+1} de ${sim.qids.length}</span><span class="muted">${sim.qids.filter(id=>sim.ans[id]).length} respondidas</span></header>
      <div class="meter"><i style="width:${(sim.idx+1)/sim.qids.length*100}%"></i></div>
      <p class="enun">${esc(q.enunciado)}</p>
      ${q.alts.map((t,i)=>{const L='ABCD'[i];return `<label class="opt"><input type="radio" name="simq" value="${L}" ${sim.ans[q.id]===L?'checked':''} data-change="simAns" data-q="${q.id}"><b>${L}</b> ${esc(t)}</label>`}).join('')}
      <div class="row"><button class="btn" data-act="simNav" data-d="-1" ${sim.idx===0?'disabled':''}>Anterior</button><button class="btn" data-act="simNav" data-d="1" ${sim.idx===sim.qids.length-1?'disabled':''}>Próxima</button><button class="btn pri" data-act="simFim">Finalizar</button></div>
    </div>`;
  }
  if(sim&&sim.done){
    const r=S.simulados.find(s=>s.id===sim.id);
    return ph('UC10 · Resultado',`Resultado — ${esc(disc(r.discId).nome)}`)+`<div class="tiles"><div class="tile"><b>${r.acertos}</b><span>Acertos</span></div><div class="tile"><b>${r.total-r.acertos}</b><span>Erros</span></div><div class="tile"><b>${Math.round(r.acertos/r.total*100)}%</b><span>Aproveitamento</span></div></div>
    <div class="tw"><table class="t"><thead><tr><th>Questão</th><th>Sua resposta</th><th>Gabarito</th><th>Resultado</th></tr></thead><tbody>
    ${r.respostas.map((x,i)=>{const q=S.questoes.find(y=>y.id===x.q);return `<tr><td>${i+1}. ${esc(q.enunciado)}</td><td class="mono">${x.r||'—'}</td><td class="mono">${q.gabarito}</td><td>${x.r===q.gabarito?pill('APROVADA','Correta'):pill('REPROVADO','Incorreta')}</td></tr>`}).join('')}
    </tbody></table></div><div class="row"><button class="btn pri" data-act="simNovo">Novo simulado</button>${r.acertos/r.total<0.6?`<button class="btn" data-act="go" data-r="agendar">Agendar atendimento com monitor</button>`:''}</div>`;
  }
  return ph('UC10 · Simulado de autoavaliação','Simulado','Questões sorteadas entre as aprovadas por professores no banco da disciplina. Use para testar seu nível antes da prova ou de agendar monitoria.')+
  `<form class="card" data-form="simIniciar" novalidate>
    ${fld('Disciplina','disc',`<select name="disc" id="sim-disc">${discs.map(d=>{const n=S.questoes.filter(q=>q.discId===d.id&&q.status==='APROVADA').length;return `<option value="${d.id}">${esc(d.nome)} — ${n} questões aprovadas</option>`}).join('')}</select>`)}
    <p class="note">${rn('RN22')} são sorteadas ${QTD_SIM} questões aprovadas da disciplina. Sem questões suficientes, o simulado não pode ser iniciado.</p>
    <div><button class="btn pri" type="submit">Iniciar simulado</button></div>
  </form>`+
  (hist.length?`<div class="card"><h2>Últimos simulados</h2><div class="tw"><table class="t"><thead><tr><th>Data</th><th>Disciplina</th><th>Aproveitamento</th></tr></thead><tbody>${hist.map(h=>`<tr><td class="num">${fmtY(h.data)}</td><td>${esc(disc(h.discId).nome)}</td><td class="num">${h.acertos}/${h.total} · ${Math.round(h.acertos/h.total*100)}%</td></tr>`).join('')}</tbody></table></div></div>`:'');
};

/* ================= views: monitor ================= */
V.painel=()=>{
  const u=me();const m=monOf(u.id);if(!m)return empty('Monitoria não encontrada.');
  const h=horasExtras(m.id);const pend=S.atendimentos.filter(a=>a.monId===m.id&&a.status==='PENDENTE').length;
  const fs=faltasMonitorSem(u.id);const allF=S.faltas.filter(f=>f.tipo==='monitor'&&f.userId===u.id);
  const ob=obrigatorias(m.id,CUR_MONTH),ex=obrigExigidas(CUR_MONTH);
  const avs=S.avaliacoes.filter(a=>a.monId===m.id).sort((a,b)=>a.data<b.data?1:-1);
  const negH=avs.filter(a=>a.tipo==='NEGATIVA'&&a.status==='HOMOLOGADA'&&semOf(a.data)===SEM).length;
  const prox=S.aulas.filter(a=>a.monId===m.id&&a.data>=TODAY).sort((a,b)=>a.data<b.data?-1:1).slice(0,3);
  return ph('',`Olá, ${esc(u.nome.split(' ')[0])}`,`${esc(disc(m.discId).nome)} · ${pill('ATIVA')} · área de domínio: ${esc(m.area)} · semestre ${SEM}`)+
  `<div class="tiles">
    <div class="tile"><b>${h}h <span class="muted" style="font-size:1rem">/ ${LIMITE_EXTRA}h</span></b><span>Horas extras em ${fmtMes(CUR_MONTH)} ${rn('RN20')}</span><div class="meter ${h>=LIMITE_EXTRA?'full':''}"><i style="width:${Math.min(100,h/LIMITE_EXTRA*100)}%"></i></div></div>
    <div class="tile"><b>${ob} <span class="muted" style="font-size:1rem">/ ${ex}</span></b><span>Aulas coletivas obrigatórias no mês ${rn('RN23')}</span></div>
    <div class="tile"><b>${pend}</b><span>Solicitações aguardando resposta</span></div>
    <div class="tile"><b>${fs.length}</b><span>Faltas não justificadas no semestre ${rn('RN12')}</span></div>
  </div>`+
  (fs.length===1?`<div class="alert warn">Você recebeu uma advertência pela 1ª falta não justificada. Uma 2ª falta no semestre gera desligamento automático ${rn('RN12')}.</div>`:'')+
  (negH===1?`<div class="alert warn">Você tem 1 avaliação negativa homologada neste semestre. Uma 2ª consecutiva gera desligamento automático ${rn('RN13')}.</div>`:'')+
  `<div class="cols"><div class="card"><header><h2>Avaliações recebidas</h2><span class="muted">Alunos anônimos</span></header>
   ${avs.length?avs.map(a=>`<div style="display:flex;flex-direction:column;gap:6px;border-top:1px solid var(--line);padding-top:10px">
     <div class="row" style="justify-content:space-between"><span><b>${a.tipo==='POSITIVA'?'Positiva':'Negativa'}</b> · ${fmtY(a.data)} · Aluno anônimo</span>${a.tipo==='NEGATIVA'?pill(a.status,a.status==='PENDENTE'?'Em apuração':a.status==='HOMOLOGADA'?'Homologada':'Não homologada'):''}</div>
     ${a.justificativa?`<p class="muted">“${esc(a.justificativa)}”</p>`:''}
     ${a.tipo==='NEGATIVA'&&a.status==='PENDENTE'?(a.defesa?`<p><b>Sua defesa:</b> ${esc(a.defesa)}</p>`:`<form data-form="defesa" data-id="${a.id}" novalidate style="display:flex;flex-direction:column;gap:8px">${fld(`Sua justificativa ${rn('RN25')}`,'defesa',`<textarea name="defesa" id="def-${a.id}" placeholder="Explique sua versão à Coordenação"></textarea>`)}<div><button class="btn sm pri" type="submit">Enviar defesa</button></div></form>`):a.defesa?`<p class="muted"><b>Sua defesa:</b> ${esc(a.defesa)}</p>`:''}
   </div>`).join(''):empty('Nenhuma avaliação recebida ainda.')}
  </div>
  <div class="card"><h2>Próximas aulas coletivas</h2>${prox.length?`<div class="tw"><table class="t"><tbody>${prox.map(a=>`<tr><td class="num">${fmtY(a.data)} ${a.hora}</td><td>${esc(a.local)}</td><td>${pill(a.tipo==='EXTRA'?'AGENDADO':'ATIVA',a.tipo==='EXTRA'?'Extra':'Obrigatória')}</td></tr>`).join('')}</tbody></table></div>`:empty('Nenhuma aula futura cadastrada.')}
    <h2>Minhas faltas</h2>${allF.length?faltasTable(allF,true):empty('Nenhuma falta registrada.')}
  </div></div>`;
};
V.horarios=()=>{
  const m=monOf(me().id);const hs=S.horarios.filter(h=>h.monId===m.id).sort((a,b)=>DIAS.indexOf(a.dia)-DIAS.indexOf(b.dia)||a.hora.localeCompare(b.hora));
  const ed=S.horarios.find(h=>h.id===ui.editHor);
  const HORAS=['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
  const horas=[...new Set(hs.map(h=>h.hora))].sort();
  return ph('UC11 · Gerenciar horários','Meus horários de atendimento','Esses horários aparecem para os alunos na busca de monitores.')+
  `<div class="card so-largo"><h2>Grade semanal</h2>${hs.length?`<div class="tw"><table class="t grade"><thead><tr><th></th>${DIAS.map(d=>`<th>${DIA_NOME[d]}</th>`).join('')}</tr></thead><tbody>${horas.map(hr=>`<tr><td>${hr}</td>${DIAS.map(d=>{const h=hs.find(x=>x.dia===d&&x.hora===hr);return `<td>${h?`<span class="slot">${h.modalidade==='REMOTO'?'Remoto':'Presencial'}</span>`:'<span class="muted">—</span>'}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`:empty('Nenhum horário cadastrado.')}</div>
  <div class="cols"><div class="card"><h2>Horários cadastrados</h2>${hs.length?`<div class="tw"><table class="t"><thead><tr><th>Dia</th><th>Horário</th><th>Modalidade</th><th></th></tr></thead><tbody>${hs.map(h=>`<tr class="${ui.editHor===h.id?'sel':''}"><td>${DIA_NOME[h.dia]}</td><td class="num">${h.hora}</td><td>${h.modalidade==='REMOTO'?'Remoto':'Presencial'}</td><td class="act"><button class="btn sm" data-act="editHor" data-id="${h.id}">Editar</button> <button class="btn sm bad" data-act="rmHor" data-id="${h.id}">Remover</button></td></tr>`).join('')}</tbody></table></div>`:empty('—')}</div>
  <form class="card" data-form="horario" novalidate><h2>${ed?'Editar horário':'Novo horário'}</h2>
    ${fld('Dia da semana','dia',`<select name="dia" id="h-dia"><option value="">Selecionar</option>${DIAS.map(d=>`<option value="${d}" ${ed&&ed.dia===d?'selected':''}>${DIA_NOME[d]}</option>`).join('')}</select>`)}
    ${fld('Horário','hora',`<select name="hora" id="h-hora"><option value="">Selecionar</option>${HORAS.map(h=>`<option ${ed&&ed.hora===h?'selected':''}>${h}</option>`).join('')}</select>`)}
    <div class="radios"><label><input type="radio" name="modalidade" value="PRESENCIAL" ${!ed||ed.modalidade==='PRESENCIAL'?'checked':''}>Presencial</label><label><input type="radio" name="modalidade" value="REMOTO" ${ed&&ed.modalidade==='REMOTO'?'checked':''}>Remoto</label></div>
    <div class="row"><button class="btn pri" type="submit">${ed?'Salvar alteração':'Adicionar horário'}</button>${ed?'<button class="btn" type="button" data-act="editHor" data-id="">Cancelar</button>':''}</div>
    <p class="note">${rn('RN17')} o monitor informa horários e áreas de domínio. Horários sobrepostos são recusados.</p>
  </form></div>`;
};
V.solicitacoes=()=>{
  const m=monOf(me().id);
  const pend=S.atendimentos.filter(a=>a.monId===m.id&&a.status==='PENDENTE').sort((a,b)=>a.data<b.data?-1:1);
  const ac=S.atendimentos.filter(a=>a.monId===m.id&&a.status==='ACEITO').sort((a,b)=>a.data<b.data?-1:1);
  const rej=S.atendimentos.find(a=>a.id===ui.rejId);const h=horasExtras(m.id);
  return ph('UC12 · UC13 · Responder solicitação','Solicitações de atendimento',`Cada atendimento individual conta 1h no limite de horas extras do mês (${h}h de ${LIMITE_EXTRA}h usadas em ${fmtMes(CUR_MONTH)}).`)+
  `<div class="card"><h2>Aguardando resposta</h2>${pend.length?`<div class="tw"><table class="t"><thead><tr><th>Aluno</th><th>Data</th><th>Modalidade</th><th>Formato</th><th>Assunto</th><th></th></tr></thead><tbody>
  ${pend.map(a=>`<tr class="${ui.rejId===a.id?'sel':''}"><td>${esc(user(a.alunoId).nome)}</td><td class="num">${DIA_NOME[a.dia].slice(0,3)} ${fmt(a.data)} ${a.hora}</td><td>${a.modalidade==='REMOTO'?'Remoto':'Presencial'}</td><td>${a.formato==='COLETIVO'?'Coletivo':'Individual'}</td><td>${esc(a.assunto)}</td><td class="act"><button class="btn sm pri" data-act="aceitar" data-id="${a.id}">Aceitar</button> <button class="btn sm bad" data-act="rejId" data-id="${a.id}">Rejeitar</button></td></tr>`).join('')}
  </tbody></table></div>`:empty('Nenhuma solicitação pendente.')}</div>`+
  (rej?`<form class="card" data-form="rejeitar" novalidate><header><h2>Rejeitar solicitação</h2></header>
    <p>${esc(user(rej.alunoId).nome)} · ${fmtY(rej.data)} às ${rej.hora} · ${esc(rej.assunto)}</p>
    ${fld('Motivo da rejeição (obrigatório)','motivo','<textarea name="motivo" id="rej-motivo" placeholder="Ex.: horário reservado para revisão coletiva; sugiro quinta às 16h"></textarea>')}
    <p class="note">${rn('RN18')} o aluno recebe o motivo e pode pedir outro horário ou outro monitor.</p>
    <div class="row"><button class="btn bad" type="submit">Confirmar rejeição</button><button class="btn" type="button" data-act="rejId" data-id="">Cancelar</button></div></form>`:'')+
  `<div class="card"><h2>Confirmados</h2>${ac.length?`<div class="tw"><table class="t"><thead><tr><th>Aluno</th><th>Data</th><th>Assunto</th><th></th></tr></thead><tbody>
  ${ac.map(a=>`<tr><td>${esc(user(a.alunoId).nome)}</td><td class="num">${fmtY(a.data)} ${a.hora}</td><td>${esc(a.assunto)}</td><td class="act">${a.data<=TODAY?`<button class="btn sm pri" data-act="presenca" data-id="${a.id}">Registrar presença</button> <button class="btn sm bad" data-act="faltaAluno" data-id="${a.id}">Falta do aluno</button>`:'<span class="muted">Aguardando data</span>'}</td></tr>`).join('')}
  </tbody></table></div>`:empty('Nenhum atendimento confirmado.')}<p class="note">${rn('RN10')} tolerância de 15 minutos. Ausência após esse prazo é registrada como falta ${rn('RN11')}.</p></div>`;
};
V.aulas=()=>{
  const m=monOf(me().id);const h=horasExtras(m.id);
  const as=S.aulas.filter(a=>a.monId===m.id).sort((a,b)=>a.data<b.data?1:-1);
  const ed=S.aulas.find(a=>a.id===ui.editAula&&a.monId===m.id&&a.data>=TODAY);
  const ck=(c)=>c?'checked':'';
  return ph('','Aulas coletivas','Cadastre a aula coletiva presencial obrigatória da semana e as aulas extras. Aulas que ainda não aconteceram podem ser editadas.')+
  `<div class="card"><header><h2>${h}h de ${LIMITE_EXTRA}h extras em ${fmtMes(CUR_MONTH)}</h2>${h>=LIMITE_EXTRA?pill('REPROVADO','Limite atingido'):''}</header><div class="meter ${h>=LIMITE_EXTRA?'full':''}"><i style="width:${Math.min(100,h/LIMITE_EXTRA*100)}%"></i></div><p class="muted">Soma das aulas coletivas extras e dos atendimentos individuais confirmados.</p></div>
  <div class="cols"><form class="card" data-form="aula" novalidate><h2>${ed?'Editar aula':'Nova aula'}</h2>
    <div class="grid2">${fld('Data','data',`<input type="date" name="data" id="au-data" min="${TODAY}" value="${ed?ed.data:''}">`)}${fld('Horário','hora',`<input type="time" name="hora" id="au-hora" value="${ed?ed.hora:''}">`)}</div>
    ${fld('Duração','duracao',`<select name="duracao" id="au-dur">${[1,2,3,4].map(n=>`<option value="${n}" ${(ed?ed.duracao:2)===n?'selected':''}>${n} hora${n>1?'s':''}</option>`).join('')}</select>`)}
    <div class="fld"><span>Tipo</span><div class="radios"><label><input type="radio" name="tipo" value="OBRIGATORIA" ${ck(!ed||ed.tipo==='OBRIGATORIA')}>Obrigatória</label><label><input type="radio" name="tipo" value="EXTRA" ${ck(ed&&ed.tipo==='EXTRA')}>Extra</label></div></div>
    <div class="fld"><span>Modalidade</span><div class="radios"><label><input type="radio" name="modalidade" value="PRESENCIAL" ${ck(!ed||ed.modalidade==='PRESENCIAL')}>Presencial</label><label><input type="radio" name="modalidade" value="REMOTO" ${ck(ed&&ed.modalidade==='REMOTO')}>Remoto</label></div><em class="ferr" data-err="modalidade"></em></div>
    ${fld('Local ou link','local',`<input name="local" id="au-local" value="${ed?esc(ed.local):''}" placeholder="Sala 12 — Bloco C ou link do Google Meet">`)}
    <div class="row"><button class="btn pri" type="submit">${ed?'Salvar alterações':'Salvar aula'}</button>${ed?'<button class="btn" type="button" data-act="editAula" data-id="">Cancelar</button>':''}</div>
  </form>
  <div class="card"><h2>Aulas cadastradas</h2>${as.length?`<div class="tw"><table class="t"><thead><tr><th>Data</th><th>Duração</th><th>Modalidade</th><th>Local/link</th><th>Tipo</th><th></th></tr></thead><tbody>${as.map(a=>`<tr class="${ui.editAula===a.id?'sel':''}"><td class="num">${fmt(a.data)} ${a.hora}</td><td class="num">${a.duracao}h</td><td>${a.modalidade==='REMOTO'?'Remoto':'Presencial'}</td><td>${esc(a.local)}</td><td>${a.tipo==='EXTRA'?pill('AGENDADO','Extra'):pill('ATIVA','Obrigatória')}</td><td class="act">${a.data>=TODAY?`<button class="btn sm" data-act="editAula" data-id="${a.id}">Editar</button>`:'<span class="muted">Realizada</span>'}</td></tr>`).join('')}</tbody></table></div>`:empty('Nenhuma aula cadastrada.')}</div></div>`;
};
V.questoes=()=>{
  const u=me();const isMon=u.perfil==='monitor';const m=isMon?monOf(u.id):null;
  if(!ui.qDisc||(isMon&&ui.qDisc!==m.discId))ui.qDisc=isMon?m.discId:S.disciplinas[0].id;
  const qs=S.questoes.filter(q=>q.discId===ui.qDisc).sort((a,b)=>a.status==='PENDENTE'?-1:1);
  const ST={APROVADA:'Aprovada',PENDENTE:'Rascunho · aguarda professor',REJEITADA:'Rejeitada'};
  return ph('UC22 · Gerenciar banco de questões','Banco de questões',isMon?'Suas questões ficam como rascunho até um professor aprová-las.':'Questões criadas por professores entram aprovadas no banco.')+
  `<div class="cols"><form class="card" data-form="questao" novalidate><h2>Nova questão</h2>
    ${isMon?`<p class="muted">Disciplina: <b>${esc(disc(m.discId).nome)}</b></p>`:fld('Disciplina','disc',`<select name="disc" id="q-disc" data-change="qDisc">${S.disciplinas.map(d=>`<option value="${d.id}" ${d.id===ui.qDisc?'selected':''}>${esc(d.nome)}</option>`).join('')}</select>`)}
    ${fld('Enunciado','enunciado','<textarea name="enunciado" id="q-enun"></textarea>')}
    ${['A','B','C','D'].map(L=>fld('Alternativa '+L,'alt'+L,`<input name="alt${L}" id="q-${L}">`)).join('')}
    ${fld('Gabarito','gabarito','<select name="gabarito" id="q-gab"><option value="">Selecionar alternativa correta</option><option>A</option><option>B</option><option>C</option><option>D</option></select>')}
    <p class="note">${rn('RN21')} questões de monitores precisam de aprovação de um professor. ${rn('RN22')} só questões aprovadas entram nos simulados.</p>
    <div><button class="btn pri" type="submit">Salvar questão</button></div>
  </form>
  <div class="card"><header><h2>${esc(disc(ui.qDisc).nome)}</h2><span class="muted">${qs.filter(q=>q.status==='APROVADA').length} aprovadas</span></header>
  ${qs.length?`<div class="tw"><table class="t"><thead><tr><th>Enunciado</th><th>Autor</th><th>Status</th></tr></thead><tbody>${qs.map(q=>`<tr><td>${esc(q.enunciado)}</td><td>${esc(user(q.autorId).nome)}</td><td>${pill(q.status,ST[q.status])}</td></tr>`).join('')}</tbody></table></div>`:empty('Nenhuma questão nesta disciplina.')}</div></div>`;
};

/* ================= views: professor ================= */
function candidatosDoProf(pid){
  return S.candidaturas.filter(c=>{if(c.status!=='EM_AVALIACAO'||!c.slotId)return false;const b=S.bancas.find(x=>x.discId===edital(c.editalId).discId);return b&&b.profs.includes(pid)});
}
V.avaliar=()=>{
  const u=me();const cs=candidatosDoProf(u.id);const c=S.candidaturas.find(x=>x.id===ui.avCand);
  const slotOf=c=>{const b=S.bancas.find(x=>x.discId===edital(c.editalId).discId);return b.slots.find(s=>s.id===c.slotId)};
  return ph('UC06 · Avaliar candidato','Avaliar candidatos','Registre seu voto e parecer depois da apresentação. Com os três votos, o sistema consolida o resultado e avisa a Coordenação.')+
  (cs.length?`<div class="tw"><table class="t"><thead><tr><th>Candidato</th><th>Disciplina</th><th>Apresentação</th><th>Votos</th><th></th></tr></thead><tbody>${cs.map(x=>{const s=slotOf(x);const nv=S.votos.filter(v=>v.candId===x.id).length;const mine=S.votos.find(v=>v.candId===x.id&&v.profId===u.id);
    return `<tr class="${ui.avCand===x.id?'sel':''}"><td><b>${esc(user(x.alunoId).nome)}</b><br><span class="muted">Nota ${nota(x.nota)}</span></td><td>${esc(disc(edital(x.editalId).discId).nome)}</td><td class="num">${fmtY(s.data)} ${s.hora}</td><td class="num">${nv} de 3</td><td class="act">${mine?`<span class="muted">Seu voto: ${mine.voto==='APROVADO'?'aprovado':'reprovado'}</span>`:s.data>TODAY?'<span class="muted">Apresentação futura</span>':`<button class="btn sm pri" data-act="avCand" data-id="${x.id}">Avaliar</button>`}</td></tr>`}).join('')}</tbody></table></div>`:empty('Nenhum candidato aguardando sua avaliação.'))+
  (c?`<form class="card" data-form="voto" novalidate><header><h2>${esc(user(c.alunoId).nome)} — ${esc(disc(edital(c.editalId).discId).nome)}</h2></header>
    <div class="radios"><label><input type="radio" name="voto" value="APROVADO" checked>Aprovado</label><label><input type="radio" name="voto" value="REPROVADO">Reprovado</label></div>
    ${fld('Parecer','parecer','<textarea name="parecer" id="v-parecer" placeholder="Didática, domínio do conteúdo, clareza da aula"></textarea>')}
    <p class="note">${rn('RN5')} banca de 3 professores, voto individual. ${rn('RN6')} após aprovação, a Coordenação autoriza a mudança de perfil.</p>
    <div class="row"><button class="btn pri" type="submit">Registrar avaliação</button><button class="btn" type="button" data-act="avCand" data-id="">Cancelar</button></div></form>`:'');
};
V.validar=()=>{
  const qs=S.questoes.filter(q=>q.status==='PENDENTE');
  return ph('UC22 · Validar questões','Questões aguardando validação','Questões enviadas por monitores. Apenas as aprovadas entram nos simulados.')+
  (qs.length?qs.map(q=>`<div class="card"><header><h2>${esc(disc(q.discId).nome)}</h2><span class="muted">por ${esc(user(q.autorId).nome)} (monitor)</span></header>
   <p class="enun"><b>${esc(q.enunciado)}</b></p>
   <ul class="checks">${q.alts.map((t,i)=>{const L='ABCD'[i];return `<li><span class="mk ${L===q.gabarito?'y':''}" style="${L===q.gabarito?'':'background:var(--sunk)'}">${L}</span><span>${esc(t)}${L===q.gabarito?' <span class="pill ok">Gabarito</span>':''}</span></li>`}).join('')}</ul>
   <div class="row"><button class="btn pri" data-act="qVal" data-id="${q.id}" data-v="APROVADA">Aprovar</button><button class="btn bad" data-act="qVal" data-id="${q.id}" data-v="REJEITADA">Rejeitar</button></div></div>`).join(''):empty('Nenhuma questão pendente.'))+`<p class="note">${rn('RN21')} ${rn('RN22')}</p>`;
};

/* ================= views: coordenação ================= */
V.visao=()=>{
  const ativos=S.monitorias.filter(m=>m.status==='ATIVA');
  const negP=S.avaliacoes.filter(a=>a.tipo==='NEGATIVA'&&a.status==='PENDENTE').length;
  const candA=S.candidaturas.filter(c=>c.status==='EM_AVALIACAO').length;
  const aprov=S.candidaturas.filter(c=>c.status==='APROVADO'&&!monOf(c.alunoId)).length;
  const fM=S.faltas.filter(f=>f.data.startsWith(CUR_MONTH)).length;
  const alerts=[];
  ativos.forEach(m=>{const h=horasExtras(m.id);if(h>=LIMITE_EXTRA)alerts.push(`${monNome(m.id)} atingiu ${h}h extras no mês ${rn('RN20')}`);if(faltasMonitorSem(m.alunoId).length===1)alerts.push(`${monNome(m.id)} tem 1 falta não justificada (advertência) ${rn('RN12')}`);if(obrigatorias(m.id,CUR_MONTH)<obrigExigidas(CUR_MONTH))alerts.push(`${monNome(m.id)} está abaixo da carga obrigatória do mês ${rn('RN23')}`)});
  if(negP)alerts.unshift(`${negP} avaliação(ões) negativa(s) aguardando apuração ${rn('RN13')}`);
  if(aprov)alerts.unshift(`${aprov} candidato(s) aprovado(s) aguardando mudança de perfil ${rn('RN6')}`);
  return ph('Coordenação de Monitorias','Visão geral',`Semestre ${SEM} · ${fmtMes(CUR_MONTH)}`)+
  `<div class="tiles"><div class="tile"><b>${ativos.length}</b><span>Monitores ativos</span></div><div class="tile"><b>${candA}</b><span>Candidaturas em avaliação</span></div><div class="tile"><b>${negP}</b><span>Negativas a apurar</span></div><div class="tile"><b>${fM}</b><span>Faltas registradas no mês</span></div></div>
  <div class="cols"><div class="card"><h2>Pontos de atenção</h2>${alerts.length?`<ul class="checks">${alerts.map(a=>`<li><span class="mk n">!</span><span>${a}</span></li>`).join('')}</ul>`:empty('Nada pendente.')}</div>
  <div class="card"><header><h2>Registro de operações</h2><span class="muted">${rn('RNF014')}</span></header><ul class="logl">${S.log.filter(l=>l.acao!=='Login realizado').slice(0,12).map(l=>`<li><time>${hhmm(l.ts)}</time><span>${esc(l.acao)} <span class="muted">— ${esc(user(l.userId)?.nome||'Sistema')}</span></span></li>`).join('')}</ul></div></div>
  <div class="card"><h2>Monitores ativos</h2><div class="tw"><table class="t"><thead><tr><th>Monitor</th><th>Disciplina</th><th>Extras no mês</th><th>Obrigatórias</th><th>Faltas (sem.)</th><th>Negativas homol.</th></tr></thead><tbody>
  ${ativos.map(m=>`<tr><td>${esc(monNome(m.id))}</td><td>${esc(disc(m.discId).nome)}</td><td class="num">${horasExtras(m.id)}h / ${LIMITE_EXTRA}h</td><td class="num">${obrigatorias(m.id,CUR_MONTH)} / ${obrigExigidas(CUR_MONTH)}</td><td class="num">${faltasMonitorSem(m.alunoId).length}</td><td class="num">${S.avaliacoes.filter(a=>a.monId===m.id&&a.status==='HOMOLOGADA'&&semOf(a.data)===SEM).length}</td></tr>`).join('')}
  </tbody></table></div></div>`;
};
V.editais_c=()=>{
  const ed=S.editais.find(e=>e.id===ui.editEd);
  return ph('UC16 · Gerenciar editais','Editais','Cadastre, edite e publique editais. O edital publicado fica visível aos alunos e aceita candidaturas no período definido.')+
  `<div class="tw"><table class="t"><thead><tr><th>Disciplina</th><th>Vagas</th><th>Ocupadas</th><th>Período</th><th>Situação</th><th></th></tr></thead><tbody>
  ${S.editais.map(e=>{const st=edStatus(e);return `<tr class="${ui.editEd===e.id?'sel':''}"><td><b>${esc(disc(e.discId).nome)}</b></td><td class="num">${e.vagas}</td><td class="num">${e.vagas-vagasRestantes(e)}</td><td class="num">${fmtY(e.inicio)} a ${fmtY(e.fim)}</td><td>${e.status==='RASCUNHO'?pill('RASCUNHO'):pill(st,st==='ABERTO'?'Publicado · aberto':st==='AGENDADO'?'Publicado · em breve':'Encerrado')}</td>
  <td class="act">${e.status==='RASCUNHO'?`<button class="btn sm" data-act="editEd" data-id="${e.id}">Editar</button> <button class="btn sm pri" data-act="pubEd" data-id="${e.id}">Publicar</button>`:st!=='ENCERRADO'?`<button class="btn sm" data-act="editEd" data-id="${e.id}">Editar</button> <button class="btn sm bad" data-act="encEd" data-id="${e.id}">Encerrar</button>`:''}</td></tr>`}).join('')}
  </tbody></table></div>
  <form class="card" data-form="edital" novalidate><h2>${ed?'Editar edital':'Novo edital'}</h2>
    <div class="grid2">
      ${fld('Disciplina','disc',`<select name="disc" id="e-disc"><option value="">Selecionar</option>${S.disciplinas.map(d=>`<option value="${d.id}" ${ed&&ed.discId===d.id?'selected':''}>${esc(d.nome)}</option>`).join('')}</select>`)}
      ${fld('Quantidade de vagas','vagas',`<input type="number" min="1" name="vagas" id="e-vagas" value="${ed?ed.vagas:''}">`)}
      ${fld('Início das candidaturas','inicio',`<input type="date" name="inicio" id="e-ini" value="${ed?ed.inicio:''}">`)}
      ${fld('Fim das candidaturas','fim',`<input type="date" name="fim" id="e-fim" value="${ed?ed.fim:''}">`)}
    </div>
    <p class="note">${rn('RN4')} candidatura só dentro do período. ${rn('RN8')} vagas por disciplina definidas no edital. Campos ausentes ou inválidos são apontados antes da publicação.</p>
    <div class="row"><button class="btn pri" type="submit" name="acao" value="publicar">${ed&&ed.status!=='RASCUNHO'?'Salvar alterações':'Publicar edital'}</button>${!ed||ed.status==='RASCUNHO'?'<button class="btn" type="submit" name="acao" value="rascunho">Salvar rascunho</button>':''}${ed?'<button class="btn" type="button" data-act="editEd" data-id="">Cancelar</button>':''}</div>
  </form>`;
};
V.bancas=()=>{
  if(!ui.bDisc)ui.bDisc=S.disciplinas[0].id;
  const b=S.bancas.find(x=>x.discId===ui.bDisc);const profs=S.users.filter(u=>u.perfil==='professor');
  const pSel=i=>`<select name="p${i}" id="b-p${i}"><option value="">Selecionar</option>${profs.map(p=>`<option value="${p.id}" ${b&&b.profs[i]===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}</select>`;
  return ph('UC17 · Gerenciar banca','Banca examinadora','Defina os três professores da banca de cada disciplina e os horários de apresentação disponíveis aos candidatos.')+
  `<div class="card">${fld('Disciplina','bDisc',`<select id="b-disc" data-change="bDisc">${S.disciplinas.map(d=>`<option value="${d.id}" ${d.id===ui.bDisc?'selected':''}>${esc(d.nome)}</option>`).join('')}</select>`)}</div>
  <div class="cols"><form class="card" data-form="banca" novalidate><header><h2>Professores da banca</h2>${rn('RN5')}</header>
    ${fld('Professor 1','p0',pSel(0))}${fld('Professor 2','p1',pSel(1))}${fld('Professor 3','p2',pSel(2))}
    <div class="formerr" data-err="geral"></div>
    <div><button class="btn pri" type="submit">Salvar banca</button></div></form>
  <div class="card"><h2>Horários de apresentação</h2>
    ${b&&b.slots.length?`<div class="tw"><table class="t"><tbody>${b.slots.slice().sort((x,y)=>x.data<y.data?-1:1).map(s=>{const c=S.candidaturas.find(x=>x.id===s.candId);return `<tr><td class="num"><b>${fmtY(s.data)}</b> · ${s.hora}</td><td>${c?esc(user(c.alunoId).nome):s.data<TODAY?'<span class="muted">Não utilizado</span>':pill('ABERTO','Livre')}</td><td class="act">${!c?`<button class="btn sm bad" data-act="rmSlot" data-id="${s.id}">Remover</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`:empty(b?'Nenhum horário cadastrado.':'Salve a banca antes de cadastrar horários.')}
    ${b?`<form data-form="slot" novalidate style="display:flex;flex-direction:column;gap:10px"><div class="grid2">${fld('Data','data',`<input type="date" name="data" id="s-data" min="${TODAY}">`)}${fld('Hora','hora','<input type="time" name="hora" id="s-hora">')}</div><div><button class="btn" type="submit">Adicionar horário</button></div></form>`:''}
  </div></div>`;
};
V.apurar=()=>{
  const avs=S.avaliacoes.filter(a=>a.tipo==='NEGATIVA').sort((a,b)=>a.status==='PENDENTE'?-1:b.status==='PENDENTE'?1:a.data<b.data?1:-1);
  return ph('UC18 · Apurar avaliação negativa','Apuração de avaliações negativas','Analise a justificativa do aluno e a defesa do monitor. A 2ª negativa consecutiva homologada no semestre desliga o monitor automaticamente.')+
  `<p class="note">${rn('RNF006')} ${rn('RN13')} o aluno aparece como “Aluno anônimo”. ${rn('RN25')} o monitor pode apresentar defesa. A contagem reinicia a cada semestre.</p>`+
  (avs.length?`<div class="tw"><table class="t"><thead><tr><th>Monitor</th><th>Data</th><th>Justificativa do aluno</th><th>Defesa do monitor</th><th>Status</th><th></th></tr></thead><tbody>
  ${avs.map(a=>{const nh=S.avaliacoes.filter(x=>x.monId===a.monId&&x.status==='HOMOLOGADA'&&semOf(x.data)===SEM).length;return `<tr><td><b>${esc(monNome(a.monId))}</b><br><span class="muted">${nh} homologada(s) no sem.</span></td><td class="num">${fmt(a.data)}</td><td>${esc(a.justificativa)}<br><span class="muted">Aluno anônimo</span></td><td>${a.defesa?esc(a.defesa):'<span class="muted">Sem defesa até o momento</span>'}</td><td>${pill(a.status,a.status==='PENDENTE'?'Pendente':a.status==='HOMOLOGADA'?'Homologada':'Rejeitada')}</td>
  <td class="act">${a.status==='PENDENTE'?`<button class="btn sm pri" data-act="homolog" data-id="${a.id}">Homologar</button> <button class="btn sm" data-act="rejAval" data-id="${a.id}">Rejeitar</button>`:''}</td></tr>`}).join('')}
  </tbody></table></div>`:empty('Nenhuma avaliação negativa registrada.'));
};
V.perfis=()=>{
  const cs=S.candidaturas.slice().sort((a,b)=>a.status==='APROVADO'?-1:1);
  return ph('UC19 · Gerenciar perfis','Perfis de usuário','Altere o perfil de Aluno para Monitor depois da aprovação pela banca. A alteração é bloqueada sem aprovação ou sem vaga no edital.')+
  `<div class="tw"><table class="t"><thead><tr><th>Nome</th><th>Matrícula</th><th>Disciplina</th><th>Perfil atual</th><th>Processo seletivo</th><th></th></tr></thead><tbody>
  ${cs.map(c=>{const u=user(c.alunoId);const e=edital(c.editalId);const nv=S.votos.filter(v=>v.candId===c.id).length;const virou=S.monitorias.some(m=>m.alunoId===u.id&&m.editalId===e.id);
   return `<tr><td><b>${esc(u.nome)}</b></td><td class="mono">${u.matricula}</td><td>${esc(disc(e.discId).nome)}<br><span class="muted">${vagasRestantes(e)} de ${e.vagas} vaga(s) livre(s)</span></td><td>${pill(u.perfil==='monitor'?'ATIVA':'',PERFIL[u.perfil])}</td><td>${pill(c.status)}${c.status==='EM_AVALIACAO'?`<br><span class="muted">${nv} de 3 votos</span>`:''}</td>
   <td class="act">${virou?'<span class="muted">Perfil alterado</span>':`<button class="btn sm ${c.status==='APROVADO'?'pri':''}" data-act="promover" data-id="${c.id}">Alterar para Monitor</button>`}</td></tr>`}).join('')}
  </tbody></table></div><p class="note">${rn('RN6')} mudança de perfil exige aprovação da banca de 3 professores e confirmação da Coordenação. ${rn('RN8')} respeita o número de vagas do edital.</p>
  <div class="card"><h2>Usuários</h2><div class="tw"><table class="t"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th></tr></thead><tbody>${S.users.map(u=>`<tr><td>${esc(u.nome)}</td><td class="mono">${esc(u.email)}</td><td>${PERFIL[u.perfil]}</td></tr>`).join('')}</tbody></table></div></div>`;
};
V.relatorios=()=>{
  if(!ui.relMes)ui.relMes=CUR_MONTH;if(!ui.relTipo)ui.relTipo='frequencia';
  const mes=ui.relMes;const meses=[CUR_MONTH,prevMonth(CUR_MONTH),prevMonth(prevMonth(CUR_MONTH))];
  const mons=S.monitorias.filter(m=>m.status==='ATIVA');
  const TIPOS={frequencia:'Frequência',extras:'Horas extras',bancas:'Andamento das bancas',negativas:'Avaliações negativas'};
  let rel='';
  if(ui.relTipo==='frequencia'){
    rel=`<table class="t"><thead><tr><th>Monitor</th><th>Disciplina</th><th>Atendimentos realizados</th><th>Aulas coletivas</th><th>Faltas do monitor</th><th>Faltas de alunos</th></tr></thead><tbody>${mons.map(m=>{
      const at=S.atendimentos.filter(a=>a.monId===m.id&&a.data.startsWith(mes)&&a.status==='CONCLUIDO').length;
      const au=S.aulas.filter(a=>a.monId===m.id&&a.data.startsWith(mes)&&a.data<=TODAY&&!a.falta).length;
      const fm=S.faltas.filter(f=>f.tipo==='monitor'&&f.userId===m.alunoId&&f.data.startsWith(mes)&&f.status!=='ACEITA').length;
      const fa=S.faltas.filter(f=>f.tipo==='aluno'&&f.monId===m.id&&f.data.startsWith(mes)).length;
      return `<tr><td>${esc(monNome(m.id))}</td><td>${esc(disc(m.discId).nome)}</td><td class="num">${at}</td><td class="num">${au}</td><td class="num">${fm}</td><td class="num">${fa}</td></tr>`}).join('')}</tbody></table>`;
  }else if(ui.relTipo==='extras'){
    rel=`<table class="t"><thead><tr><th>Monitor</th><th>Agendadas no mês</th><th>Realizadas</th><th>Limite</th></tr></thead><tbody>${mons.map(m=>{const h=horasExtras(m.id,mes),r=horasExtras(m.id,mes,true);return `<tr><td>${esc(monNome(m.id))}</td><td class="num">${h}h</td><td class="num">${r}h</td><td>${h>=LIMITE_EXTRA?pill('REPROVADO','Atingido'):pill('ABERTO',`${LIMITE_EXTRA-h}h livres`)}</td></tr>`}).join('')}</tbody></table>`;
  }else if(ui.relTipo==='bancas'){
    rel=`<table class="t"><thead><tr><th>Candidato</th><th>Disciplina</th><th>Apresentação</th><th>Votos</th><th>Resultado</th></tr></thead><tbody>${S.candidaturas.map(c=>{const e=edital(c.editalId);const b=S.bancas.find(x=>x.discId===e.discId);const s=b&&b.slots.find(x=>x.id===c.slotId);return `<tr><td>${esc(user(c.alunoId).nome)}</td><td>${esc(disc(e.discId).nome)}</td><td class="num">${s?fmtY(s.data)+' '+s.hora:'Não agendada'}</td><td class="num">${S.votos.filter(v=>v.candId===c.id).length} de 3</td><td>${pill(c.status)}</td></tr>`}).join('')}</tbody></table>`;
  }else{
    rel=`<table class="t"><thead><tr><th>Monitor</th><th>Data</th><th>Status</th></tr></thead><tbody>${S.avaliacoes.filter(a=>a.tipo==='NEGATIVA'&&a.data.startsWith(mes)).map(a=>`<tr><td>${esc(monNome(a.monId))}</td><td class="num">${fmtY(a.data)}</td><td>${pill(a.status,a.status==='PENDENTE'?'Pendente':a.status==='HOMOLOGADA'?'Homologada':'Rejeitada')}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">Nenhuma avaliação negativa no mês.</td></tr>'}</tbody></table>`;
  }
  return ph('UC20 · Gerar relatórios','Relatórios e pagamento da bolsa','Dados consolidados de atendimentos, aulas coletivas e faltas para acompanhamento e cálculo da bolsa.')+
  `<div class="card"><div class="grid2">${fld('Tipo de relatório','relTipo',`<select id="r-tipo" data-change="relTipo">${Object.entries(TIPOS).map(([k,v])=>`<option value="${k}" ${k===ui.relTipo?'selected':''}>${v}</option>`).join('')}</select>`)}${fld('Período','relMes',`<select id="r-mes" data-change="relMes">${meses.map(m=>`<option value="${m}" ${m===mes?'selected':''}>${fmtMes(m)}</option>`).join('')}</select>`)}</div>
  <h2>${TIPOS[ui.relTipo]} · ${fmtMes(mes)}</h2><div class="tw">${rel}</div></div>
  <div class="card"><header><h2>Pagamento da bolsa · ${fmtMes(mes)}</h2>${rn('RN19')}</header>
  <div class="tw"><table class="t"><thead><tr><th>Monitor</th><th>Carga obrigatória</th><th>Extras realizadas</th><th>Base</th><th>Adicional</th><th>Total</th><th></th></tr></thead><tbody>
  ${mons.map(m=>{const ob=obrigatorias(m.id,mes),ex=obrigExigidas(mes),ok=ob>=ex;const hr=Math.min(LIMITE_EXTRA,horasExtras(m.id,mes,true));const base=ok?VALOR_BASE:0,ad=hr*VALOR_HORA;const pago=S.bolsas.find(b=>b.monId===m.id&&b.mes===mes);
   return `<tr><td>${esc(monNome(m.id))}</td><td>${ok?pill('ACEITO',`Cumprida · ${ob}/${ex}`):pill('PENDENTE',`Incompleta · ${ob}/${ex}`)}</td><td class="num">${hr}h</td><td class="num">${brl(base)}</td><td class="num">${brl(ad)}</td><td class="num"><b>${brl(base+ad)}</b></td><td class="act">${pago?pill('APROVADA','Autorizado'):`<button class="btn sm pri" data-act="pagar" data-id="${m.id}" data-v="${base+ad}">Autorizar pagamento</button>`}</td></tr>`}).join('')}
  </tbody></table></div>
  <p class="note">Base de ${brl(VALOR_BASE)} liberada quando a carga obrigatória do mês é cumprida; adicional de ${brl(VALOR_HORA)} por hora extra realizada, até ${LIMITE_EXTRA}h ${rn('RN20')}. Valores ilustrativos, ajustáveis conforme o programa.</p></div>`;
};
V.desligamentos=()=>{
  const ativos=S.monitorias.filter(m=>m.status==='ATIVA');
  const fs=S.faltas.filter(f=>f.tipo==='monitor').sort((a,b)=>a.data<b.data?1:-1);
  const fa=S.faltas.filter(f=>f.tipo==='aluno').sort((a,b)=>a.data<b.data?1:-1);
  return ph('UC21 · Gerenciar desligamentos','Desligamentos e faltas','Faltas e avaliações negativas recorrentes geram desligamento automático. Infrações graves são registradas aqui e encaminhadas ao Conselho Disciplinar.')+
  `<div class="card"><h2>Monitores desligados</h2>${S.desligamentos.length?`<div class="tw"><table class="t"><thead><tr><th>Monitor</th><th>Disciplina</th><th>Motivo</th><th>Data</th><th>Nova candidatura</th><th>Encaminhamento</th></tr></thead><tbody>
  ${S.desligamentos.map(d=>`<tr><td><b>${esc(user(d.userId).nome)}</b></td><td>${esc(disc(d.discId).nome)}</td><td>${MOTIVO[d.motivo]} ${rn(MOTIVO_RN[d.motivo])}${d.detalhe?`<br><span class="muted">${esc(d.detalhe)}</span>`:''}</td><td class="num">${fmtY(d.data)}</td><td>${d.permanente?pill('REPROVADO','Bloqueada'):d.carenciaAte>=TODAY?pill('PENDENTE','Carência até '+fmtY(d.carenciaAte)):pill('ABERTO','Liberada')}</td><td>${d.conselho?pill('PENDENTE','Conselho Disciplinar'):pill('','Efetivado')}</td></tr>`).join('')}
  </tbody></table></div>`:empty('Nenhum desligamento registrado.')}<p class="note">${rn('RN14')} carência de um semestre para nova candidatura. ${rn('RN26')} ao fim da carência a candidatura é liberada automaticamente. ${rn('RN15')} infração grave: desligamento definitivo.</p></div>
  <div class="cols"><form class="card" data-form="falta" novalidate><header><h2>Registrar falta de monitor</h2>${rn('RN12')}</header>
    ${fld('Monitor','mon',`<select name="mon" id="f-mon"><option value="">Selecionar</option>${ativos.map(m=>`<option value="${m.id}">${esc(monNome(m.id))} — ${esc(disc(m.discId).nome)} (${faltasMonitorSem(m.alunoId).length} falta(s))</option>`).join('')}</select>`)}
    <div class="grid2">${fld('Data','data',`<input type="date" name="data" id="f-data" value="${TODAY}" max="${TODAY}">`)}${fld('Referência','ref','<select name="ref" id="f-ref"><option>Aula coletiva obrigatória</option><option>Aula coletiva extra</option><option>Atendimento individual</option></select>')}</div>
    <p class="muted">1ª falta não justificada: advertência. 2ª no semestre: desligamento automático.</p>
    <div><button class="btn pri" type="submit">Registrar falta</button></div></form>
  <form class="card" data-form="infracao" novalidate><header><h2>Registrar infração grave</h2>${rn('RN15')}</header>
    ${fld('Monitor','mon',`<select name="mon" id="i-mon"><option value="">Selecionar</option>${ativos.map(m=>`<option value="${m.id}">${esc(monNome(m.id))} — ${esc(disc(m.discId).nome)}</option>`).join('')}</select>`)}
    ${fld('Motivo detalhado','detalhe','<textarea name="detalhe" id="i-det"></textarea>')}
    <label class="radios"><input type="checkbox" name="conselho" id="i-cons" checked> Encaminhar ao Conselho Disciplinar</label>
    <div><button class="btn bad" type="submit">Efetivar desligamento</button></div></form></div>
  <div class="card"><h2>Faltas de monitores</h2>${fs.length?coordFaltas(fs):empty('Nenhuma falta.')}</div>
  <div class="card"><header><h2>Faltas de alunos</h2>${rn('RN11')}</header>${fa.length?coordFaltas(fa):empty('Nenhuma falta.')}<p class="note">Duas faltas não justificadas no mesmo mês bloqueiam agendamentos individuais por 15 dias.</p></div>`;
};
function coordFaltas(fs){
  return `<div class="tw"><table class="t"><thead><tr><th>Nome</th><th>Data</th><th>Referência</th><th>Situação</th><th></th></tr></thead><tbody>${fs.map(f=>`<tr><td>${esc(user(f.userId).nome)}</td><td class="num">${fmtY(f.data)}</td><td>${esc(f.ref)}${f.justificativa?`<br><span class="muted">Justificativa: ${esc(f.justificativa)}</span>`:''}</td><td>${pill(f.status)}</td><td class="act">${f.status==='JUSTIFICATIVA_ENVIADA'?`<button class="btn sm pri" data-act="aceitaJust" data-id="${f.id}">Aceitar</button> <button class="btn sm" data-act="recusaJust" data-id="${f.id}">Recusar</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
}
V.notifs=()=>{
  const u=me();const ns=S.notifs.filter(n=>n.userId===u.id);
  const html=ph('','Avisos')+(ns.length?`<div class="card" style="padding:0;gap:0">${ns.map(n=>`<div class="notif ${n.lida?'':'unread'}"><span>${esc(semCodigo(n.msg))}</span><time class="mono muted">${hhmm(n.ts)}</time></div>`).join('')}</div>`:empty('Nenhum aviso.'));
  setTimeout(()=>{ns.forEach(n=>n.lida=true);save()},0);
  return html;
};

/* ================= ações ================= */
const ACT={};
ACT.authMode=d=>{ui.authMode=d.v;render()};
ACT.demo=async d=>{const u=S.users.find(x=>x.email===d.email);S.session=u.id;ui.route=null;render();toast(`Entrou como ${u.nome} (${PERFIL[u.perfil]}).`)};
ACT.logout=()=>{ui.menu=false;S.session=null;ui.route=null;ui.authMode='login';ui.sim=null;render()};
ACT.go=d=>go(d.r,d.p||null);
ACT.reset=()=>ask('Restaurar dados de exemplo?','Todas as alterações feitas neste navegador serão descartadas e os dados de demonstração voltam ao estado inicial.','Restaurar',async()=>{const sess=null;await seed();S.session=sess;ui.route=null;render();toast('Dados de exemplo restaurados.')},true);
ACT.modalClose=(d,el,e)=>{if(e&&e.target.closest('[data-stop]')&&!el.matches('button'))return;ui.modal=null;confirmFn=null;render()};
ACT.modalOk=async()=>{const fn=confirmFn;ui.modal=null;confirmFn=null;if(fn)await fn();render()};
ACT.candidatar=d=>{
  const u=me();const e=edital(d.id);const el=elegibilidade(u,e);
  if(!el.ok)return toast('Candidatura bloqueada: '+el.checks.find(c=>!c.ok).txt,'bad');
  S.candidaturas.push({id:nid('c'),alunoId:u.id,editalId:e.id,nota:u.notas[e.discId],semestre:SEM,data:TODAY,status:'EM_AVALIACAO',slotId:null});
  coordIds().forEach(c=>notify(c,`Nova candidatura de ${u.nome} para ${disc(e.discId).nome}.`));
  log(`Candidatura registrada: ${u.nome} — ${disc(e.discId).nome}`);
  toast('Candidatura registrada com sucesso.');go('candidaturas');
};
ACT.slot=d=>{
  const c=S.candidaturas.find(x=>x.id===d.c);const b=S.bancas.find(x=>x.discId===edital(c.editalId).discId);const s=b.slots.find(x=>x.id===d.s);
  if(s.candId)return toast('Esse horário acabou de ser ocupado. Escolha outro.','bad');
  s.candId=c.id;c.slotId=s.id;b.profs.forEach(p=>notify(p,`${user(c.alunoId).nome} vai apresentar aula em ${fmtY(s.data)} às ${s.hora}.`));
  log(`Horário de banca escolhido por ${user(c.alunoId).nome}`);toast('Horário da apresentação confirmado.');render();
};
ACT.agMon=d=>{ui.agMon=d.id;ui.agSlot=null;render()};
ACT.agSlot=d=>{ui.agSlot=d.id;render()};
ACT.avalAt=d=>{ui.avalAt=d.id||null;render()};
ACT.justFalta=d=>{
  const f=S.faltas.find(x=>x.id===d.id);
  ask('Enviar justificativa de falta',`<form id="jf" style="display:flex;flex-direction:column;gap:10px">${fld('Justificativa','j','<textarea id="jf-j" name="j" placeholder="Motivo da ausência"></textarea>')}${fld('Comprovante (nome do arquivo)','c','<input id="jf-c" name="c" type="file">')}</form>`,'Enviar',()=>{
    const j=document.getElementById('jf-j')?.value.trim();const c=document.getElementById('jf-c')?.files?.[0]?.name||'';
    if(!j){toast('Escreva a justificativa antes de enviar.','bad');return}
    f.status='JUSTIFICATIVA_ENVIADA';f.justificativa=j;f.comprovante=c;coordIds().forEach(x=>notify(x,`${user(f.userId).nome} enviou justificativa de falta (${fmtY(f.data)}).`));log(`Justificativa de falta enviada por ${user(f.userId).nome}`);toast('Justificativa enviada à Coordenação.');
  });
};
ACT.simNav=d=>{ui.sim.idx+=+d.d;render()};
ACT.simFim=()=>{
  const sim=ui.sim;const u=me();
  const falt=sim.qids.filter(id=>!sim.ans[id]).length;
  const fin=()=>{const resp=sim.qids.map(q=>({q,r:sim.ans[q]||null}));const ac=resp.filter(x=>x.r===S.questoes.find(y=>y.id===x.q).gabarito).length;
    const id=nid('sm');S.simulados.unshift({id,alunoId:u.id,discId:sim.discId,data:TODAY,respostas:resp,acertos:ac,total:resp.length});sim.done=true;sim.id=id;log(`Simulado concluído por ${u.nome} (${ac}/${resp.length})`);render()};
  if(falt)ask('Finalizar simulado?',`Há ${falt} questão(ões) sem resposta. Elas contam como erro.`,'Finalizar',fin);else fin();
};
ACT.simNovo=()=>{ui.sim=null;render()};
ACT.editHor=d=>{ui.editHor=d.id||null;render()};
ACT.editAula=d=>{ui.editAula=d.id||null;render()};
ACT.menu=()=>{ui.menu=!ui.menu;const l=document.querySelector('.layout');if(l)l.classList.toggle('menu-aberto',ui.menu);const b=document.querySelector('.menubtn');if(b)b.setAttribute('aria-expanded',ui.menu?'true':'false')};
ACT.rmHor=d=>{const h=S.horarios.find(x=>x.id===d.id);ask('Remover horário?',`${DIA_NOME[h.dia]} às ${h.hora} deixa de aparecer para os alunos. Solicitações já enviadas continuam valendo.`,'Remover',()=>{S.horarios=S.horarios.filter(x=>x.id!==d.id);log('Horário de atendimento removido');toast('Horário removido.')},true)};
ACT.aceitar=d=>{
  const a=S.atendimentos.find(x=>x.id===d.id);
  if(horasExtras(a.monId,a.data.slice(0,7))+1>LIMITE_EXTRA)return toast(`Limite de ${LIMITE_EXTRA}h extras em ${fmtMes(a.data.slice(0,7))} atingido (RN20). Rejeite informando o motivo.`,'bad');
  a.status='ACEITO';notify(a.alunoId,`${monNome(a.monId)} confirmou seu atendimento em ${fmtY(a.data)} às ${a.hora}.`);log(`Atendimento confirmado por ${monNome(a.monId)}`);toast('Agendamento confirmado. O aluno foi avisado.');render();
};
ACT.rejId=d=>{ui.rejId=d.id||null;render()};
ACT.presenca=d=>{const a=S.atendimentos.find(x=>x.id===d.id);a.status='CONCLUIDO';log(`Presença registrada: atendimento de ${user(a.alunoId).nome}`);notify(a.alunoId,`Atendimento de ${fmtY(a.data)} concluído. Você já pode avaliá-lo.`);toast('Presença registrada.');render()};
ACT.faltaAluno=d=>{
  const a=S.atendimentos.find(x=>x.id===d.id);
  ask('Registrar falta do aluno?',`${esc(user(a.alunoId).nome)} não compareceu em ${fmtY(a.data)} após a tolerância de 15 minutos.`,'Registrar falta',()=>{
    a.status='FALTA_ALUNO';S.faltas.push({id:nid('f'),tipo:'aluno',userId:a.alunoId,monId:a.monId,atendId:a.id,data:a.data,ref:`Atendimento individual — ${disc(monById(a.monId).discId).nome}`,status:'INJUSTIFICADA',justificativa:''});
    const b=bloqueioAluno(a.alunoId);notify(a.alunoId,`Falta registrada no atendimento de ${fmtY(a.data)}. Você pode enviar justificativa em até 48h.`+(b?` Agendamentos individuais bloqueados até ${fmtY(b)} (RN11).`:''));
    log(`Falta de aluno registrada: ${user(a.alunoId).nome}`);toast(b?`Falta registrada. Aluno bloqueado até ${fmtY(b)} (RN11).`:'Falta registrada.',b?'warn':'');
  },true);
};
ACT.qVal=d=>{const q=S.questoes.find(x=>x.id===d.id);q.status=d.v;q.validadoPor=S.session;notify(q.autorId,`Sua questão de ${disc(q.discId).nome} foi ${d.v==='APROVADA'?'aprovada e entrou no banco':'rejeitada'}.`);log(`Questão ${d.v==='APROVADA'?'aprovada':'rejeitada'} (${disc(q.discId).nome})`);toast(d.v==='APROVADA'?'Questão aprovada e adicionada ao banco.':'Questão rejeitada.');render()};
ACT.avCand=d=>{ui.avCand=d.id||null;render()};
ACT.editEd=d=>{ui.editEd=d.id||null;render()};
ACT.pubEd=d=>{const e=edital(d.id);const err=validaEdital(e.discId,e.vagas,e.inicio,e.fim);if(Object.keys(err).length)return toast('Corrija o edital antes de publicar: '+Object.values(err)[0],'bad');e.status='PUBLICADO';log(`Edital de ${disc(e.discId).nome} publicado (${e.vagas} vaga(s))`);toast('Edital publicado com sucesso.');render()};
ACT.encEd=d=>{const e=edital(d.id);ask('Encerrar edital?',`O edital de ${esc(disc(e.discId).nome)} deixa de aceitar candidaturas.`,'Encerrar',()=>{e.status='ENCERRADO';log(`Edital de ${disc(e.discId).nome} encerrado`);toast('Edital encerrado.')},true)};
ACT.rmSlot=d=>{const b=S.bancas.find(x=>x.discId===ui.bDisc);b.slots=b.slots.filter(s=>s.id!==d.id);toast('Horário removido.');render()};
ACT.homolog=d=>{
  const a=S.avaliacoes.find(x=>x.id===d.id);const m=monById(a.monId);
  const prev=S.avaliacoes.filter(x=>x.monId===a.monId&&x.id!==a.id&&x.tipo==='NEGATIVA'&&x.status!=='PENDENTE'&&semOf(x.data)===SEM).sort((x,y)=>x.data<y.data?-1:1).slice(-1)[0];
  const vaiDesligar=prev&&prev.status==='HOMOLOGADA';
  ask('Homologar avaliação negativa?',`A avaliação passa a contar no histórico de <b>${esc(monNome(a.monId))}</b>.${vaiDesligar?'<div class="alert bad" style="margin-top:10px">Esta é a 2ª negativa consecutiva homologada no semestre. O monitor será desligado automaticamente (RN13).</div>':''}`,'Homologar',()=>{
    a.status='HOMOLOGADA';a.decididoPor=S.session;log(`Avaliação negativa homologada — ${monNome(a.monId)}`);
    notify(m.alunoId,`Uma avaliação negativa sua foi homologada pela Coordenação.`);
    if(m.status==='ATIVA'&&negativasConsecutivas(m.id)){desligar(m,'AVALIACAO_NEGATIVA_RECORRENTE','Duas avaliações negativas consecutivas homologadas.');toast(`Avaliação homologada. ${user(m.alunoId).nome} foi desligado automaticamente (RN13).`,'warn')}
    else toast('Avaliação homologada.');
  },vaiDesligar);
};
ACT.rejAval=d=>{const a=S.avaliacoes.find(x=>x.id===d.id);ask('Rejeitar avaliação negativa?','A avaliação é arquivada como improcedente e não conta para desligamento.','Rejeitar',()=>{a.status='REJEITADA';a.decididoPor=S.session;notify(monById(a.monId).alunoId,'Uma avaliação negativa sua foi considerada improcedente e arquivada.');log(`Avaliação negativa rejeitada — ${monNome(a.monId)}`);toast('Avaliação rejeitada e arquivada.')})};
ACT.promover=d=>{
  const c=S.candidaturas.find(x=>x.id===d.id);const u=user(c.alunoId);const e=edital(c.editalId);
  if(c.status!=='APROVADO')return toast(`Alteração bloqueada. ${u.nome} não tem aprovação registrada pela banca (RN6).`,'bad');
  if(vagasRestantes(e)<=0)return toast(`Alteração bloqueada. As ${e.vagas} vaga(s) do edital já foram preenchidas (RN8).`,'bad');
  if(monOf(u.id))return toast(`${u.nome} já atua como monitor neste semestre (RN7).`,'bad');
  ask('Alterar perfil para Monitor?',`<b>${esc(u.nome)}</b> passa a ter as funções de Monitor em ${esc(disc(e.discId).nome)}. Votos da banca: ${S.votos.filter(v=>v.candId===c.id&&v.voto==='APROVADO').length} de 3 aprovando.`,'Confirmar alteração',()=>{
    u.perfil='monitor';S.monitorias.push({id:nid('m'),alunoId:u.id,discId:e.discId,semestre:SEM,status:'ATIVA',area:'A definir pelo monitor',editalId:e.id});
    notify(u.id,`Seu perfil foi alterado para Monitor de ${disc(e.discId).nome}. Cadastre seus horários e sua área de domínio.`);
    log(`Perfil de ${u.nome} alterado para Monitor (${disc(e.discId).nome})`);toast('Perfil alterado e funcionalidades de monitor liberadas.');
  });
};
ACT.pagar=d=>{const m=monById(d.id);ask('Autorizar pagamento?',`Bolsa de <b>${esc(monNome(m.id))}</b> referente a ${fmtMes(ui.relMes)}: <b>${brl(+d.v)}</b>.`,'Autorizar',()=>{S.bolsas.push({monId:m.id,mes:ui.relMes,valor:+d.v,autorizadoPor:S.session,em:TODAY});notify(m.alunoId,`Pagamento da bolsa de ${fmtMes(ui.relMes)} autorizado: ${brl(+d.v)}.`);log(`Pagamento autorizado: ${monNome(m.id)} — ${brl(+d.v)} (${fmtMes(ui.relMes)})`);toast('Pagamento autorizado e registrado.')})};
ACT.aceitaJust=d=>{const f=S.faltas.find(x=>x.id===d.id);f.status='ACEITA';notify(f.userId,`Sua justificativa de falta (${fmtY(f.data)}) foi aceita.`);log(`Justificativa de falta aceita — ${user(f.userId).nome}`);toast('Justificativa aceita. A falta não conta para penalidade.');render()};
ACT.recusaJust=d=>{const f=S.faltas.find(x=>x.id===d.id);f.status='INJUSTIFICADA';notify(f.userId,`Sua justificativa de falta (${fmtY(f.data)}) não foi aceita.`);log(`Justificativa de falta recusada — ${user(f.userId).nome}`);toast('Justificativa recusada.');render()};

/* ================= formulários ================= */
const FORMS={};
FORMS.login=async(fd,f)=>{
  const email=(fd.get('email')||'').trim().toLowerCase(),senha=fd.get('senha')||'';
  const e={};if(!email)e.email='Informe o e-mail institucional.';if(!senha)e.senha='Informe a senha.';if(showErrors(f,e))return;
  const u=S.users.find(x=>x.email===email);
  if(!u||u.senhaHash!==await sha(email+':'+senha)){f.querySelector('[data-err="geral"]').textContent='Credenciais inválidas. Confira o e-mail e a senha.';return}
  S.session=u.id;ui.route=null;render();
};
FORMS.cadastro=async(fd,f)=>{
  const v=Object.fromEntries(fd);const e={};const email=(v.email||'').trim().toLowerCase();
  if(v.nome.trim().split(/\s+/).length<2)e.nome='Informe nome e sobrenome.';
  if(!v.curso)e.curso='Selecione o curso.';
  if(!/^\d{10}$/.test(v.matricula.trim()))e.matricula='A matrícula deve ter 10 dígitos.';else if(S.users.some(u=>u.matricula===v.matricula.trim()))e.matricula='Esta matrícula já está cadastrada.';
  if(!/^[a-z0-9._-]+@(aluno\.)?uea\.edu\.br$/.test(email))e.email='Use seu e-mail institucional (@aluno.uea.edu.br).';else if(S.users.some(u=>u.email===email))e.email='Este e-mail já está cadastrado.';
  if(v.senha.length!==8)e.senha='A senha deve ter exatamente 8 caracteres.';
  if(v.senha!==v.confirma)e.confirma='As senhas não conferem.';
  if(showErrors(f,e))return;
  const id=nid('u');S.users.push({id,nome:v.nome.trim(),email,perfil:'aluno',curso:v.curso,matricula:v.matricula.trim(),notas:historico(v.matricula.trim()),senhaHash:await sha(email+':'+v.senha)});
  S.session=id;log(`Cadastro de aluno: ${v.nome.trim()}`);ui.route=null;render();toast('Cadastro realizado com sucesso.');
};
FORMS.agendar=(fd,f)=>{
  const u=me();const h=S.horarios.find(x=>x.id===ui.agSlot);
  if(bloqueioAluno(u.id))return toast('Agendamentos individuais bloqueados (RN11).','bad');
  if(!h)return toast('Selecione um horário livre.','bad');
  const assunto=(fd.get('assunto')||'').trim();if(showErrors(f,assunto?{}:{assunto:'Informe o assunto do atendimento (RN18).'}))return;
  const data=nextDate(h.dia);
  if(horasExtras(h.monId,data.slice(0,7))>=LIMITE_EXTRA)return toast('Este monitor atingiu o limite de horas extras do mês (RN20).','bad');
  if(S.atendimentos.some(a=>a.monId===h.monId&&a.data===data&&a.hora===h.hora&&['PENDENTE','ACEITO'].includes(a.status)))return toast('Esse horário já tem uma solicitação. Escolha outro.','bad');
  S.atendimentos.push({id:nid('a'),alunoId:u.id,monId:h.monId,dia:h.dia,hora:h.hora,data,modalidade:fd.get('modalidade'),formato:fd.get('formato'),assunto,status:'PENDENTE',criadoEm:TODAY});
  notify(monById(h.monId).alunoId,`Nova solicitação de atendimento de ${u.nome} para ${fmtY(data)} às ${h.hora}.`);
  log(`Solicitação de atendimento: ${u.nome} → ${monNome(h.monId)}`);ui.agSlot=null;toast('Solicitação enviada ao monitor.');go('atendimentos');
};
FORMS.avaliar=(fd,f)=>{
  const u=me();const at=S.atendimentos.find(a=>a.id===ui.avalAt);const tipo=fd.get('tipo');const j=(fd.get('justificativa')||'').trim();
  if(tipo==='NEGATIVA'&&showErrors(f,j?{}:{justificativa:'A justificativa é obrigatória para avaliação negativa (RN13).'}))return;
  S.avaliacoes.push({id:nid('av'),atendId:at.id,monId:at.monId,alunoId:u.id,tipo,justificativa:tipo==='NEGATIVA'?j:'',defesa:'',status:tipo==='NEGATIVA'?'PENDENTE':'—',data:TODAY});
  if(tipo==='NEGATIVA'){coordIds().forEach(c=>notify(c,`Nova avaliação negativa de ${monNome(at.monId)} aguardando apuração.`));notify(monById(at.monId).alunoId,'Você recebeu uma avaliação negativa de um aluno anônimo. Envie sua defesa pelo painel (RN25).')}
  log(`Avaliação ${tipo==='NEGATIVA'?'negativa':'positiva'} registrada para ${monNome(at.monId)}`);
  ui.avalAt=null;toast(tipo==='NEGATIVA'?'Avaliação enviada anonimamente à Coordenação para apuração.':'Avaliação registrada. Obrigado!');render();
};
FORMS.simIniciar=fd=>{
  const id=fd.get('disc');const pool=S.questoes.filter(q=>q.discId===id&&q.status==='APROVADA');
  if(pool.length<QTD_SIM)return toast(`Não há questões aprovadas suficientes em ${disc(id).nome} (${pool.length} de ${QTD_SIM}). Tente outra disciplina.`,'bad');
  const sh=pool.map(q=>[Math.random(),q.id]).sort((a,b)=>a[0]-b[0]).slice(0,QTD_SIM).map(x=>x[1]);
  ui.sim={discId:id,qids:sh,ans:{},idx:0,done:false};render();
};
FORMS.defesa=(fd,f)=>{const t=(fd.get('defesa')||'').trim();if(showErrors(f,t?{}:{defesa:'Escreva sua defesa antes de enviar.'}))return;const a=S.avaliacoes.find(x=>x.id===f.dataset.id);a.defesa=t;coordIds().forEach(c=>notify(c,`${monNome(a.monId)} enviou defesa sobre avaliação negativa.`));log(`Defesa enviada por ${monNome(a.monId)}`);toast('Defesa enviada à Coordenação.');render()};
FORMS.horario=(fd,f)=>{
  const m=monOf(me().id);const dia=fd.get('dia'),hora=fd.get('hora'),mod=fd.get('modalidade');const e={};
  if(!dia)e.dia='Selecione o dia.';if(!hora)e.hora='Selecione o horário.';
  if(dia&&hora&&S.horarios.some(h=>h.monId===m.id&&h.dia===dia&&h.hora===hora&&h.id!==ui.editHor))e.hora='Já existe um horário neste dia e hora.';
  if(showErrors(f,e))return;
  const ed=S.horarios.find(h=>h.id===ui.editHor);
  if(ed)Object.assign(ed,{dia,hora,modalidade:mod});else S.horarios.push({id:nid('h'),monId:m.id,dia,hora,modalidade:mod});
  ui.editHor=null;log(`Horário ${ed?'atualizado':'cadastrado'}: ${DIA_NOME[dia]} ${hora}`);toast('Horário registrado com sucesso.');render();
};
FORMS.rejeitar=(fd,f)=>{const mo=(fd.get('motivo')||'').trim();if(showErrors(f,mo?{}:{motivo:'Informe o motivo da rejeição (RN18).'}))return;const a=S.atendimentos.find(x=>x.id===ui.rejId);a.status='REJEITADO';a.motivo=mo;notify(a.alunoId,`${monNome(a.monId)} recusou seu atendimento de ${fmtY(a.data)}. Motivo: ${mo}`);log(`Atendimento rejeitado por ${monNome(a.monId)}`);ui.rejId=null;toast('Solicitação rejeitada e aluno avisado.');render()};
FORMS.aula=(fd,f)=>{
  const m=monOf(me().id);const v=Object.fromEntries(fd);v.duracao=+v.duracao;const e={};
  const ed=S.aulas.find(a=>a.id===ui.editAula&&a.monId===m.id&&a.data>=TODAY);
  if(!v.data)e.data='Informe a data.';else if(v.data<TODAY)e.data='A data não pode estar no passado.';
  if(!v.hora)e.hora='Informe o horário.';if(!v.local.trim())e.local='Informe o local ou o link.';
  if(v.tipo==='OBRIGATORIA'&&v.modalidade!=='PRESENCIAL')e.modalidade='A aula coletiva obrigatória deve ser presencial.';
  if(showErrors(f,e))return;
  if(v.tipo==='EXTRA'){
    const mes=v.data.slice(0,7);let h=horasExtras(m.id,mes);
    if(ed&&ed.tipo==='EXTRA'&&ed.data.startsWith(mes))h-=ed.duracao; // desconta a própria aula em edição
    if(h+v.duracao>LIMITE_EXTRA)return toast(`${ed?'Alteração bloqueada':'Novo agendamento bloqueado'}. Limite mensal atingido: ${h}h de ${LIMITE_EXTRA}h já usadas em ${fmtMes(mes)}.`,'bad');
  }
  const dados={data:v.data,hora:v.hora,duracao:v.duracao,modalidade:v.modalidade,local:v.local.trim(),tipo:v.tipo};
  if(ed){Object.assign(ed,dados);log(`Aula coletiva de ${fmtY(v.data)} alterada por ${me().nome}`);toast('Aula atualizada.')}
  else{S.aulas.push({id:nid('au'),monId:m.id,...dados});log(`Aula coletiva ${v.tipo==='EXTRA'?'extra':'obrigatória'} cadastrada por ${me().nome}`);toast('Aula registrada e disponibilizada aos alunos.')}
  ui.editAula=null;render();
};
FORMS.questao=(fd,f)=>{
  const u=me();const v=Object.fromEntries(fd);const e={};
  if(!v.enunciado.trim())e.enunciado='Escreva o enunciado.';['A','B','C','D'].forEach(L=>{if(!v['alt'+L].trim())e['alt'+L]='Preencha a alternativa.'});if(!v.gabarito)e.gabarito='Escolha o gabarito.';
  if(showErrors(f,e))return;
  const discId=u.perfil==='monitor'?monOf(u.id).discId:v.disc;const st=u.perfil==='monitor'?'PENDENTE':'APROVADA';
  S.questoes.push({id:nid('q'),discId,autorId:u.id,enunciado:v.enunciado.trim(),alts:['A','B','C','D'].map(L=>v['alt'+L].trim()),gabarito:v.gabarito,status:st,data:TODAY});
  if(st==='PENDENTE')S.users.filter(x=>x.perfil==='professor').forEach(p=>notify(p,`Nova questão de ${disc(discId).nome} aguardando validação.`));
  log(`Questão cadastrada (${disc(discId).nome}) por ${u.nome}`);toast(st==='PENDENTE'?'Questão salva como rascunho até a aprovação de um professor.':'Questão adicionada ao banco.');render();
};
FORMS.voto=(fd,f)=>{
  const u=me();const c=S.candidaturas.find(x=>x.id===ui.avCand);const p=(fd.get('parecer')||'').trim();
  if(showErrors(f,p?{}:{parecer:'Escreva o parecer sobre a apresentação.'}))return;
  S.votos.push({candId:c.id,profId:u.id,voto:fd.get('voto'),parecer:p});log(`Voto de banca registrado por ${u.nome} (${user(c.alunoId).nome})`);
  const vs=S.votos.filter(v=>v.candId===c.id);
  if(vs.length>=3){const ap=vs.filter(v=>v.voto==='APROVADO').length;c.status=ap>=2?'APROVADO':'REPROVADO';
    coordIds().forEach(x=>notify(x,`Banca concluída: ${user(c.alunoId).nome} foi ${c.status==='APROVADO'?'aprovado(a)':'reprovado(a)'} (${ap} de 3 votos). ${c.status==='APROVADO'?'Autorize a mudança de perfil.':''}`));
    notify(c.alunoId,`Resultado da banca de ${disc(edital(c.editalId).discId).nome}: ${c.status==='APROVADO'?'aprovado(a). Aguarde a Coordenação liberar seu perfil de Monitor.':'não aprovado(a) neste processo.'}`);
    log(`Banca consolidada: ${user(c.alunoId).nome} — ${c.status}`);toast(`Avaliações consolidadas: ${c.status==='APROVADO'?'aprovado':'reprovado'} (${ap} de 3). Resultado enviado à Coordenação.`);
  }else toast(`Avaliação registrada (${vs.length} de 3).`);
  ui.avCand=null;render();
};
function validaEdital(discId,vagas,inicio,fim){const e={};if(!discId)e.disc='Selecione a disciplina.';if(!(+vagas>0)||!Number.isInteger(+vagas))e.vagas='Informe um número de vagas maior que zero (RN8).';if(!inicio)e.inicio='Informe a data de início.';if(!fim)e.fim='Informe a data de fim.';else if(inicio&&fim<inicio)e.fim='O fim deve ser depois do início.';return e}
FORMS.edital=(fd,f,sub)=>{
  const v=Object.fromEntries(fd);const acao=sub?.value||'publicar';const e=validaEdital(v.disc,v.vagas,v.inicio,v.fim);
  if(showErrors(f,e))return;
  const ed=S.editais.find(x=>x.id===ui.editEd);
  if(ed)Object.assign(ed,{discId:v.disc,vagas:+v.vagas,inicio:v.inicio,fim:v.fim},acao==='publicar'&&ed.status==='RASCUNHO'?{status:'PUBLICADO'}:{});
  else S.editais.push({id:nid('e'),discId:v.disc,vagas:+v.vagas,inicio:v.inicio,fim:v.fim,status:acao==='publicar'?'PUBLICADO':'RASCUNHO'});
  log(`Edital de ${disc(v.disc).nome} ${acao==='publicar'?'publicado':'salvo como rascunho'} (${v.vagas} vaga(s))`);ui.editEd=null;
  toast(acao==='publicar'?'Edital publicado com sucesso. Fica disponível aos alunos no período definido.':'Rascunho salvo.');render();
};
FORMS.banca=(fd,f)=>{
  const ps=[fd.get('p0'),fd.get('p1'),fd.get('p2')];const e={};ps.forEach((p,i)=>{if(!p)e['p'+i]='Selecione o professor.'});
  if(!Object.keys(e).length&&new Set(ps).size<3)e.geral='É obrigatória a indicação de exatamente 3 professores diferentes para a banca (RN5).';
  if(e.geral){showErrors(f,{});f.querySelector('[data-err="geral"]').textContent=e.geral;return}
  if(showErrors(f,e))return;
  let b=S.bancas.find(x=>x.discId===ui.bDisc);if(b)b.profs=ps;else S.bancas.push({id:nid('b'),discId:ui.bDisc,profs:ps,slots:[]});
  ps.forEach(p=>notify(p,`Você foi indicado(a) para a banca de ${disc(ui.bDisc).nome}.`));log(`Banca de ${disc(ui.bDisc).nome} registrada`);toast('Banca registrada com sucesso.');render();
};
FORMS.slot=(fd,f)=>{const d=fd.get('data'),h=fd.get('hora');const e={};if(!d)e.data='Informe a data.';else if(d<TODAY)e.data='Escolha uma data futura.';if(!h)e.hora='Informe a hora.';if(showErrors(f,e))return;const b=S.bancas.find(x=>x.discId===ui.bDisc);if(b.slots.some(s=>s.data===d&&s.hora===h))return showErrors(f,{hora:'Esse horário já existe.'});b.slots.push({id:nid('sl'),data:d,hora:h});log(`Horário de banca cadastrado (${disc(ui.bDisc).nome})`);toast('Horário disponibilizado aos candidatos.');render()};
FORMS.falta=(fd,f)=>{
  const v=Object.fromEntries(fd);const e={};if(!v.mon)e.mon='Selecione o monitor.';if(!v.data)e.data='Informe a data.';if(showErrors(f,e))return;
  const m=monById(v.mon);const u=user(m.alunoId);const n=faltasMonitorSem(u.id).length+1;
  const go2=()=>{S.faltas.push({id:nid('f'),tipo:'monitor',userId:u.id,monId:m.id,data:v.data,ref:v.ref,status:'INJUSTIFICADA',justificativa:''});log(`Falta não justificada registrada para ${u.nome}`);
    if(n>=2&&semOf(v.data)===SEM){desligar(m,'FALTA_RECORRENTE',`${n}ª falta não justificada no semestre.`);toast(`Falta registrada. ${u.nome} foi desligado automaticamente (RN12).`,'warn')}
    else{notify(u.id,`Advertência: falta não justificada em ${fmtY(v.data)} (${v.ref}). Justifique em até 48h. Uma 2ª falta no semestre gera desligamento (RN12).`);toast('Falta registrada e advertência enviada ao monitor.')}};
  ask('Registrar falta não justificada?',`${esc(u.nome)} — ${esc(v.ref)} em ${fmtY(v.data)}.${n>=2?'<div class="alert bad" style="margin-top:10px">Esta é a 2ª falta não justificada no semestre. O monitor será desligado automaticamente.</div>':' Será enviada uma advertência.'}`,'Registrar',go2,n>=2);
};
FORMS.infracao=(fd,f)=>{
  const v=Object.fromEntries(fd);const e={};if(!v.mon)e.mon='Selecione o monitor.';if(!(v.detalhe||'').trim())e.detalhe='Descreva a infração.';if(showErrors(f,e))return;
  const m=monById(v.mon);
  ask('Efetivar desligamento definitivo?',`${esc(monNome(m.id))} será desligado sem direito a nova candidatura${v.conselho?' e o caso será encaminhado ao Conselho Disciplinar':''}.`,'Efetivar desligamento',()=>{const n=monNome(m.id);desligar(m,'INFRACAO_GRAVE',v.detalhe.trim(),!!v.conselho);toast(`Desligamento efetivado${v.conselho?' e encaminhado ao Conselho Disciplinar':''}.`,'warn')},true);
};

/* ================= mudanças de seleção ================= */
const CHG={};
CHG.agDisc=v=>{ui.agDisc=v;ui.agMon=null;ui.agSlot=null;render()};
CHG.bDisc=v=>{ui.bDisc=v;render()};
CHG.qDisc=v=>{ui.qDisc=v;render()};
CHG.relTipo=v=>{ui.relTipo=v;render()};
CHG.relMes=v=>{ui.relMes=v;render()};
CHG.simAns=(v,el)=>{ui.sim.ans[el.dataset.q]=v};
CHG.avalTipo=v=>{const t=document.getElementById('av-just');if(t)t.placeholder=v==='NEGATIVA'?'Obrigatória: descreva o que aconteceu':'Opcional'};

/* ================= render ================= */
const VIEWS=V;
function render(){
  const app=document.getElementById('app');const u=me();
  const m0=app.querySelector('.main'),s0=app.querySelector('.side');
  const pos={m:m0&&!ui.topo?m0.scrollTop:0,sx:s0?s0.scrollLeft:0,sy:s0?s0.scrollTop:0};ui.topo=false;
  if(!u){app.innerHTML=viewAuth()+modalHtml();save();return}
  const nav=NAV[u.perfil];
  const allowed=nav.flatMap(g=>g.items.map(i=>i[0])).concat(['notifs'],u.perfil==='aluno'?['candidatar']:[]);
  if(!allowed.includes(ui.route))ui.route=nav[0].items[0][0];
  const v=(VIEWS[ui.route]||(()=>''))();
  app.innerHTML=shell(u,nav,v)+modalHtml();
  app.querySelectorAll('table.t:not(.grade)').forEach(t=>{const hs=[...t.querySelectorAll('thead th')].map(th=>th.textContent.trim());if(!hs.length)return;t.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(hs[i])td.dataset.label=hs[i];if(!td.classList.contains('act')&&td.childNodes.length){const v=document.createElement('span');v.className='v';while(td.firstChild)v.appendChild(td.firstChild);td.appendChild(v)}}))});
  const m1=app.querySelector('.main'),s1=app.querySelector('.side');
  if(m1)m1.scrollTop=pos.m;if(s1){s1.scrollLeft=pos.sx;s1.scrollTop=pos.sy}
  save();
  if(ui.modal){const b=document.getElementById('modal-ok');if(b&&!document.querySelector('.modal input,.modal textarea'))b.focus();else document.querySelector('.modal textarea')?.focus()}
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  if(el.dataset.act==='modalClose'&&el.classList.contains('modal-bg')&&e.target!==el)return;
  e.preventDefault();ACT[el.dataset.act]?.(el.dataset,el,e);
});
document.addEventListener('submit',e=>{e.preventDefault();const f=e.target.closest('form[data-form]');if(!f)return;FORMS[f.dataset.form]?.(new FormData(f),f,e.submitter)});
document.addEventListener('change',e=>{const el=e.target.closest('[data-change]');if(el)CHG[el.dataset.change]?.(el.value,el)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.modal){ui.modal=null;confirmFn=null;render()}else if(e.key==='Escape'&&ui.menu)ACT.menu()});

(async()=>{
  let st=null;try{st=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
  if(st&&st.users&&st.disciplinas)S=st;else await seed();
  render();
})();
