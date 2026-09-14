// CR-132 Design Review — Screen 2: Printer Settings (Before vs After)
// Decision 2026-08-11: Printer Settings from settings-list API get a dedicated wizard step.
// CR-133 PrinterAgentConfigView (hardware/style) remains separate at Settings → Printers.
import React, { useState } from 'react';

const C = { orange:'#F26B33', orangeLight:'#FDF0EB', green:'#329937', dark:'#1A1A2E', gray:'#6B7280', border:'#E5E7EB', bg:'#F7F7F7', white:'#FFFFFF', blue:'#3B82F6', blueLight:'#EBF5FF' };

const NewBadge  = () => <span style={{background:C.orangeLight,color:C.orange,border:`1px solid ${C.orange}30`,fontSize:9,fontWeight:800,letterSpacing:1,padding:'1px 6px',borderRadius:99,marginLeft:6,verticalAlign:'middle',textTransform:'uppercase'}}>NEW</span>;
const MovedBadge = () => <span style={{background:'#F0FFF4',color:'#059669',border:`1px solid #05966930`,fontSize:9,fontWeight:800,letterSpacing:1,padding:'1px 6px',borderRadius:99,marginLeft:6,verticalAlign:'middle',textTransform:'uppercase'}}>MOVED FROM S5</span>;

const Card = ({title,desc,children,allNew,accent}) => (
  <div style={{background:C.white,border:`1.5px solid ${allNew||accent?C.orange+'55':C.border}`,borderRadius:12,marginBottom:16,overflow:'hidden',boxShadow:allNew||accent?`0 0 0 3px ${C.orange}10`:'0 1px 3px rgba(0,0,0,0.06)'}}>
    <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,background:allNew?C.orangeLight:C.white}}>
      <div style={{fontSize:14,fontWeight:700,color:C.dark}}>{title}{allNew&&<NewBadge/>}</div>
      {desc&&<div style={{fontSize:11,color:C.gray,marginTop:2}}>{desc}</div>}
    </div>
    <div style={{padding:'16px 20px'}}>{children}</div>
  </div>
);

const TRow = ({label,isNew,isMoved,hint,type='toggle',options,highlight}) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${C.border}`,background:(isNew||isMoved)&&highlight?C.orangeLight:'transparent',margin:(isNew||isMoved)?'0 -20px':'0',padding:(isNew||isMoved)?'8px 20px':'8px 0'}}>
    <div>
      <span style={{fontSize:12,fontWeight:600,color:C.dark}}>{label}</span>
      {isNew&&<NewBadge/>}{isMoved&&<MovedBadge/>}
      {hint&&<div style={{fontSize:10,color:C.gray,marginTop:1}}>{hint}</div>}
    </div>
    {type==='toggle'&&<div style={{width:36,height:20,borderRadius:10,background:C.green,position:'relative',flexShrink:0}}><div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:2,right:2}}/></div>}
    {type==='select'&&<select style={{fontSize:11,border:`1px solid ${C.border}`,borderRadius:6,padding:'3px 8px',flexShrink:0}}>{(options||[]).map(o=><option key={o}>{o}</option>)}</select>}
  </div>
);

const InfoBox = ({color,bg,text}) => <div style={{background:bg,border:`1px solid ${color}30`,borderRadius:8,padding:'8px 14px',marginBottom:16,fontSize:11,color,fontWeight:600}}>{text}</div>;
const Grid2 = ({children}) => <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>{children}</div>;

const NEW_STEPS = ['Basic Settings','Printer Settings','Channels & Info','Tax & Charges','Order & Kitchen','Online Ordering','Inventory','Room & Hospitality'];
const OLD_STEPS = ['Restaurant Identity','Channels & Payments','Charges & Tips','Order & Kitchen','Inventory & Extras','Owner Info'];

const Sidebar = ({steps,active,label}) => (
  <div style={{width:176,background:C.white,borderRight:`1px solid ${C.border}`,flexShrink:0,display:'flex',flexDirection:'column'}}>
    <div style={{padding:'12px 14px 8px',borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:9,fontWeight:700,color:C.orange,letterSpacing:1,marginBottom:2}}>{label}</div>
      <div style={{fontSize:12,fontWeight:800,color:C.dark}}>Restaurant Setup</div>
    </div>
    <div style={{padding:'8px 10px',flex:1}}>
      {steps.map((s,i)=>{
        const isActive=i===active;
        return <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:7,marginBottom:2,background:isActive?C.orangeLight:'transparent',borderLeft:isActive?`3px solid ${C.orange}`:'3px solid transparent'}}>
          <div style={{width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,flexShrink:0,background:isActive?C.orange:C.border,color:isActive?'#fff':C.gray}}>{i+1}</div>
          <span style={{fontSize:10,fontWeight:isActive?700:500,color:isActive?C.orange:C.gray,lineHeight:1.3}}>{s}</span>
        </div>;
      })}
    </div>
  </div>
);

const OldScreen = () => (
  <div style={{flex:1,overflowY:'auto',padding:'16px 20px 80px'}}>
    <InfoBox color={C.blue} bg={C.blueLight} text="OLD WIZARD: No dedicated Printer Settings step. Print KOT and Auto Print Bill were buried in Step 4 (Order & Kitchen). All other printer fields were not accessible in the wizard at all." />
    <Card title="Step 4 — Order & Kitchen (extract)">
      <TRow label="Print KOT" hint="Only printer field accessible in old wizard" />
      <TRow label="Auto Print Bill" hint="Only printer field accessible in old wizard" />
    </Card>
    <Card title="Missing from old wizard (not configurable)" desc="These fields existed in the API but had no UI">
      <TRow label="Bill Copies" hint="basic.no_of_bill — was not in wizard" type="select" options={['1','2','3']} />
      <TRow label="KOT Copies" hint="basic.no_of_kot — was not in wizard" type="select" options={['1','2','3']} />
      <TRow label="Print in KDS" hint="basic.printing_in_kds — was not in wizard" />
      <TRow label="Print Customer Copy" hint="basic.print_bill_customer_copy — was not in wizard" />
      <TRow label="Token on Bill/KOT" hint="basic.use_token — was not in wizard" />
      <TRow label="KOT Language" hint="basic.kot_language — was not in wizard" type="select" options={['English','Hindi']} />
    </Card>
  </div>
);

const NewScreen = ({highlight}) => (
  <div style={{flex:1,overflowY:'auto',padding:'16px 20px 80px'}}>
    <InfoBox color={C.orange} bg={C.orangeLight} text="NEW: Dedicated Printer Settings step. All settings-list API printer fields in one place. CR-133 PrinterAgentConfigView (hardware/style config) remains separate at Settings → Printers." />
    <Card title="Print Behaviour" desc="When and how the system prints" isMoved>
      <Grid2>
        <TRow label="Print KOT" isMoved hint="Print KOT on order placement (moved from Step 4)" highlight={highlight}/>
        <TRow label="Auto Print Bill" isMoved hint="Auto-print bill after payment (moved from Step 4)" highlight={highlight}/>
        <TRow label="Print in KDS" isNew hint="Send print jobs to Kitchen Display System" highlight={highlight}/>
        <TRow label="Print Customer Copy" isNew hint="Print a separate copy for the customer" highlight={highlight}/>
      </Grid2>
    </Card>
    <Card title="Copies" desc="Number of copies to print per document" allNew>
      <Grid2>
        <TRow label="Bill Copies" isNew hint="How many bill copies to print" type="select" options={['1','2','3']} highlight={highlight}/>
        <TRow label="KOT Copies" isNew hint="How many KOT copies to print" type="select" options={['1','2','3']} highlight={highlight}/>
      </Grid2>
    </Card>
    <Card title="KOT & Token Options" desc="KOT language and token number settings" allNew>
      <TRow label="Token on Bill/KOT" isNew hint="Print token number on bills and kitchen tickets" highlight={highlight}/>
      <TRow label="KOT Language" isNew type="select" options={['English','Hindi']} hint="Language for Kitchen Order Tickets" highlight={highlight}/>
    </Card>
    <Card title="Printer Agent" desc="Hardware configuration — separate from wizard">
      <InfoBox color={C.gray} bg={C.bg} text="Printer hardware config (printer IP, port, bill style, paper size) is managed separately at Settings → Printers via the Printer Agent screen (CR-133)." />
    </Card>
  </div>
);

export default function Screen2ComparisonPage() {
  const [highlight, setHighlight] = useState(true);
  return (
    <div style={{fontFamily:'Inter,system-ui,sans-serif',minHeight:'100vh',background:C.bg}}>
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:'14px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><span style={{fontSize:11,color:'#aaa',marginRight:8}}>CR-132 Design Review</span><span style={{fontSize:14,fontWeight:700}}>Screen 2 — Printer Settings: Before vs After</span></div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <label style={{fontSize:11,color:C.gray,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}>
            <input type="checkbox" checked={highlight} onChange={e=>setHighlight(e.target.checked)} style={{accentColor:C.orange}}/>
            Highlight changes
          </label>
          <a href="/screen1-compare" style={{fontSize:11,color:C.orange}}>← S1</a>
          <a href="/screen3-compare" style={{fontSize:11,color:C.orange}}>S3 →</a>
        </div>
      </div>
      <div style={{display:'flex',height:'calc(100vh - 53px)'}}>
        <div style={{flex:1,display:'flex',borderRight:`2px solid ${C.border}`,maxWidth:'50%'}}>
          <Sidebar steps={OLD_STEPS} active={3} label="OLD WIZARD"/>
          <OldScreen/>
        </div>
        <div style={{flex:1,display:'flex',maxWidth:'50%',background:'rgba(242,107,51,0.02)'}}>
          <Sidebar steps={NEW_STEPS} active={1} label="NEW WIZARD"/>
          <NewScreen highlight={highlight}/>
        </div>
      </div>
    </div>
  );
}
