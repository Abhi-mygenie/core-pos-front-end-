// CR-132 Design Review — Screen 5: Order & Kitchen (Before vs After)
import React, { useState } from 'react';

const C = { orange:'#F26B33', orangeLight:'#FDF0EB', green:'#329937', dark:'#1A1A2E', gray:'#6B7280', border:'#E5E7EB', bg:'#F7F7F7', white:'#FFFFFF', blue:'#3B82F6', blueLight:'#EBF5FF' };

const NewBadge = () => <span style={{background:C.orangeLight,color:C.orange,border:`1px solid ${C.orange}30`,fontSize:9,fontWeight:800,letterSpacing:1,padding:'1px 6px',borderRadius:99,marginLeft:6,verticalAlign:'middle',textTransform:'uppercase'}}>NEW</span>;
const MovedBadge = () => <span style={{background:'#F0FFF4',color:'#059669',border:`1px solid #05966930`,fontSize:9,fontWeight:800,letterSpacing:1,padding:'1px 6px',borderRadius:99,marginLeft:6,verticalAlign:'middle',textTransform:'uppercase'}}>MOVED FROM S1</span>;
const RemovedBadge = () => <span style={{background:'#FEF2F2',color:'#EF4444',border:`1px solid #EF444430`,fontSize:9,fontWeight:800,letterSpacing:1,padding:'1px 6px',borderRadius:99,marginLeft:6,verticalAlign:'middle',textTransform:'uppercase'}}>MOVED AWAY</span>;

const Card = ({title,desc,children,allNew,accent}) => (
  <div style={{background:C.white,border:`1.5px solid ${allNew||accent?C.orange+'55':C.border}`,borderRadius:12,marginBottom:16,overflow:'hidden',boxShadow:allNew||accent?`0 0 0 3px ${C.orange}10`:'0 1px 3px rgba(0,0,0,0.06)'}}>
    <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,background:allNew?C.orangeLight:C.white}}>
      <div style={{fontSize:14,fontWeight:700,color:C.dark}}>{title}{allNew&&<NewBadge/>}</div>
      {desc&&<div style={{fontSize:11,color:C.gray,marginTop:2}}>{desc}</div>}
    </div>
    <div style={{padding:'16px 20px'}}>{children}</div>
  </div>
);

const TRow = ({label,isNew,hint,type='toggle',options,faded,highlight}) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${C.border}`,background:isNew&&highlight?C.orangeLight:'transparent',margin:isNew?'0 -20px':'0',padding:isNew?'8px 20px':'8px 0',opacity:faded?0.4:1}}>
    <div>
      <span style={{fontSize:12,fontWeight:600,color:C.dark}}>{label}</span>
      {isNew&&<NewBadge/>}
      {hint&&<div style={{fontSize:10,color:C.gray,marginTop:1}}>{hint}</div>}
    </div>
    {type==='toggle'&&<div data-testid={`toggle-${label.toLowerCase().replace(/\s+/g,'-')}`} style={{width:36,height:20,borderRadius:10,background:faded?C.border:C.green,position:'relative',flexShrink:0}}><div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:2,right:2}}/></div>}
    {type==='select'&&<select style={{fontSize:11,border:`1px solid ${C.border}`,borderRadius:6,padding:'3px 8px',flexShrink:0}}>{(options||[]).map(o=><option key={o}>{o}</option>)}</select>}
  </div>
);

const FakeInput = ({label,placeholder,isNew,hint,suffix}) => (
  <div style={{marginBottom:10,padding:isNew?'8px 12px':'0',background:isNew?C.orangeLight:'transparent',borderRadius:isNew?8:0,border:isNew?`1px solid ${C.orange}30`:'none'}}>
    <label style={{fontSize:11,fontWeight:600,color:C.dark,display:'block',marginBottom:4}}>{label}{isNew&&<NewBadge/>}</label>
    {hint&&<div style={{fontSize:10,color:C.gray,marginBottom:4}}>{hint}</div>}
    <div style={{display:'flex',gap:6}}>
      <input readOnly placeholder={placeholder} style={{flex:1,fontSize:11,border:`1px solid ${C.border}`,borderRadius:6,padding:'6px 10px',color:C.gray}}/>
      {suffix&&<span style={{fontSize:11,color:C.gray,alignSelf:'center'}}>{suffix}</span>}
    </div>
  </div>
);

const Grid2 = ({children}) => <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>{children}</div>;
const InfoBox = ({color,bg,text}) => <div style={{background:bg,border:`1px solid ${color}30`,borderRadius:8,padding:'8px 14px',marginBottom:16,fontSize:11,color,fontWeight:600}}>{text}</div>;

const NEW_STEPS = ['Basic Settings','Printer Settings','Channels & Info','Tax & Charges','Order & Kitchen','Online Ordering','Inventory','Room & Hospitality'];
const OLD_STEPS = ['Restaurant Identity','Channels & Payments','Charges & Tips','Order & Kitchen','Inventory & Extras','Owner Info'];

const Sidebar = ({steps,active,label,small}) => (
  <div style={{width:small?160:176,background:C.white,borderRight:`1px solid ${C.border}`,flexShrink:0,display:'flex',flexDirection:'column'}}>
    <div style={{padding:'12px 14px 8px',borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:9,fontWeight:700,color:C.orange,letterSpacing:1,marginBottom:2}}>{label}</div>
      <div style={{fontSize:12,fontWeight:800,color:C.dark}}>Restaurant Setup</div>
    </div>
    <div style={{padding:'8px 10px',flex:1,overflowY:'auto'}}>
      {steps.map((s,i)=>{
        const isActive=i===active, isDeferred=s.startsWith('⏸');
        return <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:7,marginBottom:2,background:isActive?C.orangeLight:'transparent',borderLeft:isActive?`3px solid ${C.orange}`:'3px solid transparent',opacity:isDeferred?0.45:1}}>
          <div style={{width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,flexShrink:0,background:isActive?C.orange:C.border,color:isActive?'#fff':C.gray}}>{i+1}</div>
          <span style={{fontSize:10,fontWeight:isActive?700:500,color:isActive?C.orange:C.gray,lineHeight:1.3}}>{s.replace('⏸ ','')}{isDeferred?' (deferred)':''}</span>
        </div>;
      })}
    </div>
  </div>
);

const OldScreen = () => (
  <div style={{flex:1,overflowY:'auto',padding:'16px 20px 80px'}}>
    <Card title="Order & Kitchen" desc="KOT, KDS, order preferences">
      <TRow label="Default Order Status" type="select" options={['Serve','Ready','Accept','Bill']}/>
      <TRow label="Serve Item Display" type="select" options={['Dynamic','Static']}/>
      <TRow label="Print KOT" hint="Print KOT on order placement"/>
      <TRow label="Auto Print Bill" hint="Automatically print bill after payment"/>
      <TRow label="Cancel After Serve" hint="Allow cancellation after food served"/>
      <TRow label="Voice in KDS" hint="Voice announcements on kitchen display"/>
      <TRow label="Real-Time Order Status" hint="Live status updates on dashboard"/>
      <TRow label="Confirm Web Orders" hint="Manual confirm for online orders"/>
      <TRow label="Show Scan Pop Up" hint="Scan order popup on dashboard"/>
    </Card>
    <Card title="Display settings (mixed into step 4)" desc="">
      <InfoBox color={C.blue} bg={C.blueLight} text="These display fields were on step 4 but move to Screen 1 (Basic Settings) in the new wizard."/>
      <TRow label="Show Popular Category" faded/>
      <TRow label="Food Level Notes" faded/>
      <TRow label="Show Food Variance" faded/>
      <TRow label="Show AC / Non-AC Menu" faded/>
      <TRow label="Food Date Tracking" faded/>
    </Card>
  </div>
);

const NewScreen = ({highlight}) => (
  <div style={{flex:1,overflowY:'auto',padding:'16px 20px 80px'}}>
    <Card title="Order Workflow" desc="How orders flow from placement to kitchen">
      <Grid2>
        <TRow label="Cancel After Serve" highlight={highlight}/>
        <TRow label="Order Auto Serve" isNew hint="Auto-serve items when kitchen marks ready" highlight={highlight}/>
        <TRow label="Schedule Orders" isNew hint="Enable future scheduled orders" highlight={highlight}/>
      </Grid2>
      <TRow label="Serve Item Display" type="select" options={['Dynamic','Static']} highlight={highlight}/>
    </Card>

    <Card title="Kitchen Display (KDS)" desc="Voice and real-time status settings">
      <Grid2>
        <TRow label="Voice in KDS" hint="Voice announcements on KDS" highlight={highlight}/>
        <TRow label="Real-Time Order Status" hint="Live updates on dashboard" highlight={highlight}/>
      </Grid2>
    </Card>

    <Card title="Confirmations & Pop-ups" desc="Online order confirmation and scan settings" accent>
      <TRow label="Confirm Web Orders" hint="Require manual confirmation for online/web orders" highlight={highlight}/>
      <TRow label="Show Scan Pop Up" hint="Show scan popup on dashboard for QR orders" highlight={highlight}/>
      <TRow label="Show Confirm Order Tab" isNew hint="Dedicated tab in order screen for confirmation" highlight={highlight}/>
      <TRow label="Confirm Order Tone" isNew type="select" options={['Default','Buzzer','Chime','Silent']} hint="Sound played when a new online order arrives" highlight={highlight}/>
      <TRow label="Location Selection" isNew type="select" options={['Scanner (QR)','Manual']} hint="How table/location is identified on order" highlight={highlight}/>
    </Card>

    <Card title="Search By" desc="Fields staff can use to search for orders">
      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
        {['Order ID','Table No','Phone No','User ID'].map(o=>(
          <div key={o} style={{padding:'5px 14px',borderRadius:20,background:'rgba(50,153,55,0.08)',border:'2px solid rgba(50,153,55,0.3)',fontSize:11,fontWeight:600,color:'#329937'}}>{o}</div>
        ))}
      </div>
    </Card>
  </div>
);

export default function Screen5ComparisonPage() {
  const [highlight,setHighlight] = useState(true);
  return (
    <div style={{minHeight:'100vh',background:'#EAEAEA',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:C.dark,color:'#fff',padding:'10px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><span style={{fontSize:11,color:'#aaa',marginRight:8}}>CR-132 Design Review</span><span style={{fontSize:14,fontWeight:700}}>Screen 5 — Order & Kitchen: Before vs After</span></div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#ccc',cursor:'pointer'}}><input data-testid="highlight-toggle" type="checkbox" checked={highlight} onChange={e=>setHighlight(e.target.checked)}/>Highlight NEW</label>
          <a href="/screen4-compare" style={{fontSize:11,color:'#aaa',textDecoration:'none'}}>← S4</a>
          <a href="/screen6-compare" style={{fontSize:11,color:C.orange,textDecoration:'none'}}>S6 →</a>
          <a href="/settings-preview" style={{fontSize:11,color:'#aaa',textDecoration:'none'}}>All</a>
        </div>
      </div>
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:'8px 24px',display:'flex',gap:20,alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:10,height:10,borderRadius:2,background:C.orangeLight,border:`1px solid ${C.orange}55`}}/><span style={{fontSize:11,color:C.gray}}>New field</span></div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:10,height:10,borderRadius:2,background:'#fff',border:`1px solid ${C.border}`}}/><span style={{fontSize:11,color:C.gray}}>Existing</span></div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:10,height:10,borderRadius:2,background:'#FEF2F2',border:`1px solid #EF444455`}}/><span style={{fontSize:11,color:C.gray}}>Moved away to Screen 1</span></div>
        <div style={{marginLeft:'auto',fontSize:11,color:C.gray}}>OLD: 1 mixed step (9 fields) &nbsp;|&nbsp;<strong style={{color:C.orange}}>NEW: 4 sections, +5 new fields, 5 moved to Screen 1</strong></div>
      </div>
      <div style={{display:'flex',height:'calc(100vh - 88px)',gap:0}}>
        <div style={{flex:1,display:'flex',flexDirection:'column',borderRight:'3px solid #ddd'}}>
          <div style={{background:'#4B5563',color:'#fff',padding:'8px 20px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:700,background:'#6B7280',padding:'2px 8px',borderRadius:99}}>CURRENT</span>
            <span style={{fontSize:13,fontWeight:600}}>Step 4: Order & Kitchen</span>
            <span style={{marginLeft:'auto',fontSize:10,color:'#9CA3AF'}}>1 card · 6 steps total</span>
          </div>
          <div style={{display:'flex',flex:1,overflow:'hidden',background:C.bg}}>
            <Sidebar steps={OLD_STEPS} active={3} label="OLD WIZARD"/>
            <OldScreen/>
          </div>
          <div style={{background:'#374151',padding:'8px 20px',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
            <button style={{background:C.green,color:'#fff',border:'none',borderRadius:8,padding:'7px 20px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Save & Continue →</button>
          </div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column'}}>
          <div style={{background:C.orange,color:'#fff',padding:'8px 20px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:700,background:'rgba(255,255,255,0.25)',padding:'2px 8px',borderRadius:99}}>PROPOSED</span>
            <span style={{fontSize:13,fontWeight:600}}>Screen 5: Order & Kitchen</span>
            <span style={{marginLeft:'auto',fontSize:10,color:'rgba(255,255,255,0.75)'}}>4 sections · 8 steps total</span>
          </div>
          <div style={{display:'flex',flex:1,overflow:'hidden',background:C.bg}}>
            <Sidebar steps={NEW_STEPS} active={4} label="NEW WIZARD"/>
            <NewScreen highlight={highlight}/>
          </div>
          <div style={{background:'#fff',borderTop:`1px solid ${C.border}`,padding:'8px 20px',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
            <button data-testid="screen5-save-continue" style={{background:C.green,color:'#fff',border:'none',borderRadius:8,padding:'7px 20px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Save & Continue →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
