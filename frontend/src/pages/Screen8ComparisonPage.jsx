// CR-132 Design Review — Screen 8: Inventory (Before vs After)
import React, { useState } from 'react';

const C = { orange:'#F26B33', orangeLight:'#FDF0EB', green:'#329937', dark:'#1A1A2E', gray:'#6B7280', border:'#E5E7EB', bg:'#F7F7F7', white:'#FFFFFF', blue:'#3B82F6', blueLight:'#EBF5FF' };

const NewBadge = () => <span style={{background:C.orangeLight,color:C.orange,border:`1px solid ${C.orange}30`,fontSize:9,fontWeight:800,letterSpacing:1,padding:'1px 6px',borderRadius:99,marginLeft:6,verticalAlign:'middle',textTransform:'uppercase'}}>NEW</span>;
const MovedBadge = ({to}) => <span style={{background:'#FEF2F2',color:'#EF4444',border:`1px solid #EF444430`,fontSize:9,fontWeight:800,letterSpacing:1,padding:'1px 6px',borderRadius:99,marginLeft:6,verticalAlign:'middle',textTransform:'uppercase'}}>MOVED TO {to}</span>;

const Card = ({title,desc,children,allNew,accent}) => (
  <div style={{background:C.white,border:`1.5px solid ${allNew||accent?C.orange+'55':C.border}`,borderRadius:12,marginBottom:16,overflow:'hidden',boxShadow:allNew||accent?`0 0 0 3px ${C.orange}10`:'0 1px 3px rgba(0,0,0,0.06)'}}>
    <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,background:allNew?C.orangeLight:C.white}}>
      <div style={{fontSize:14,fontWeight:700,color:C.dark}}>{title}{allNew&&<NewBadge/>}</div>
      {desc&&<div style={{fontSize:11,color:C.gray,marginTop:2}}>{desc}</div>}
    </div>
    <div style={{padding:'16px 20px'}}>{children}</div>
  </div>
);

const TRow = ({label,isNew,faded,movedTo,hint,type='toggle',options,highlight}) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${C.border}`,background:isNew&&highlight?C.orangeLight:'transparent',margin:isNew?'0 -20px':'0',padding:isNew?'8px 20px':'8px 0',opacity:faded?0.4:1}}>
    <div>
      <span style={{fontSize:12,fontWeight:600,color:C.dark}}>{label}</span>
      {isNew&&<NewBadge/>}
      {movedTo&&<MovedBadge to={movedTo}/>}
      {hint&&<div style={{fontSize:10,color:C.gray,marginTop:1}}>{hint}</div>}
    </div>
    {type==='toggle'&&<div data-testid={`toggle-${label.toLowerCase().replace(/\s+/g,'-')}`} style={{width:36,height:20,borderRadius:10,background:faded?C.border:C.green,position:'relative',flexShrink:0}}><div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:2,right:2}}/></div>}
    {type==='select'&&<select style={{fontSize:11,border:`1px solid ${C.border}`,borderRadius:6,padding:'3px 8px',flexShrink:0}}>{(options||[]).map(o=><option key={o}>{o}</option>)}</select>}
  </div>
);

const FakeInput = ({label,placeholder,faded,movedTo,hint}) => (
  <div style={{marginBottom:10,opacity:faded?0.4:1}}>
    <label style={{fontSize:11,fontWeight:600,color:C.dark,display:'block',marginBottom:4}}>{label}{movedTo&&<MovedBadge to={movedTo}/>}</label>
    {hint&&<div style={{fontSize:10,color:C.gray,marginBottom:4}}>{hint}</div>}
    <input readOnly placeholder={placeholder} style={{width:'100%',fontSize:11,border:`1px solid ${C.border}`,borderRadius:6,padding:'6px 10px',color:C.gray,boxSizing:'border-box'}}/>
  </div>
);

const Grid2 = ({children}) => <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>{children}</div>;

const NEW_STEPS = ['Basic Settings','⏸ Printer Setup','Channels & Info','Tax & Charges','Order & Kitchen','Online Ordering','Aggregator','Inventory','Room & Hospitality'];
const OLD_STEPS = ['Restaurant Identity','Channels & Payments','Charges & Tips','Order & Kitchen','Inventory & Extras','Owner Info'];

const Sidebar = ({steps,active,label}) => (
  <div style={{width:176,background:C.white,borderRight:`1px solid ${C.border}`,flexShrink:0,display:'flex',flexDirection:'column'}}>
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
    <div style={{background:'#FEF2F2',border:'1px solid #EF444430',borderRadius:8,padding:'8px 14px',marginBottom:16,fontSize:11,color:'#EF4444',fontWeight:600}}>
      Many fields in old Step 5 are moving away to Screen 3 (Contact/Feedback) and Screen 1 (Phone on Bill). Only the inventory fields remain here.
    </div>
    <Card title="Inventory Management" desc="Stock, alerts and billing options">
      <TRow label="Inventory Tracking" hint="Track stock levels for menu items"/>
      <div style={{borderLeft:`3px solid ${C.border}`,marginLeft:12,paddingLeft:12,marginTop:2,marginBottom:4}}>
        <TRow label="Allow Negative Inventory" hint="Continue selling when stock is zero"/>
        <FakeInput label="Inventory Alert Number" placeholder="Phone for stock alerts"/>
        <FakeInput label="Inventory Manager" placeholder="Manager name"/>
      </div>
      <TRow label="Settlement Report" hint="Enable day-end settlement" faded movedTo="S3"/>
      <TRow label="Feedback Collection" faded movedTo="S3"/>
      <FakeInput label="Phone on Bill" placeholder="Number on bills" faded movedTo="S1"/>
      <FakeInput label="Report Contact Number" placeholder="Report phone" faded movedTo="S3"/>
      <FakeInput label="Delivery Contact" placeholder="Delivery coordination" faded movedTo="S3"/>
      <FakeInput label="Delivery Person Name" placeholder="Default delivery person" faded movedTo="S3"/>
      <FakeInput label="Online Ordering Link" placeholder="https://..." faded movedTo="S6"/>
    </Card>
  </div>
);

const NewScreen = ({highlight}) => (
  <div style={{flex:1,overflowY:'auto',padding:'16px 20px 80px'}}>
    <Card title="Inventory Tracking" desc="Stock tracking and replenishment alerts">
      <TRow label="Inventory Tracking" hint="Track stock levels for menu items" highlight={highlight}/>
      <div style={{borderLeft:`3px solid ${C.border}`,marginLeft:12,paddingLeft:12,marginTop:2,marginBottom:4}}>
        <TRow label="Allow Negative Inventory" hint="Continue selling when stock is zero" highlight={highlight}/>
        <Grid2>
          <FakeInput label="Inventory Alert Number" placeholder="Phone for alerts"/>
          <FakeInput label="Inventory Manager" placeholder="Manager name"/>
        </Grid2>
      </div>
    </Card>

    <Card title="Auto Accept & Purchase" desc="Automated inventory management" allNew>
      <TRow label="Auto Accept Inventory" isNew hint="Auto-accept stock transfers and purchases" highlight={highlight}/>
    </Card>
  </div>
);

export default function Screen8ComparisonPage() {
  const [highlight,setHighlight] = useState(true);
  return (
    <div style={{minHeight:'100vh',background:'#EAEAEA',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:C.dark,color:'#fff',padding:'10px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div><span style={{fontSize:11,color:'#aaa',marginRight:8}}>CR-132 Design Review</span><span style={{fontSize:14,fontWeight:700}}>Screen 8 — Inventory: Before vs After</span></div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#ccc',cursor:'pointer'}}><input data-testid="highlight-toggle" type="checkbox" checked={highlight} onChange={e=>setHighlight(e.target.checked)}/>Highlight NEW</label>
          <a href="/screen7-compare" style={{fontSize:11,color:'#aaa',textDecoration:'none'}}>← S7</a>
          <a href="/screen9-compare" style={{fontSize:11,color:C.orange,textDecoration:'none'}}>S9 →</a>
          <a href="/settings-preview" style={{fontSize:11,color:'#aaa',textDecoration:'none'}}>All</a>
        </div>
      </div>
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:'8px 24px',display:'flex',gap:20,alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:10,height:10,borderRadius:2,background:C.orangeLight,border:`1px solid ${C.orange}55`}}/><span style={{fontSize:11,color:C.gray}}>New field</span></div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:10,height:10,borderRadius:2,background:'#FEF2F2',border:`1px solid #EF444455`}}/><span style={{fontSize:11,color:C.gray}}>Moved away from old Step 5</span></div>
        <div style={{marginLeft:'auto',fontSize:11,color:C.gray}}>OLD: Step 5 had 12 fields (9 moved away) &nbsp;|&nbsp;<strong style={{color:C.orange}}>NEW: 2 sections, +1 new field, clean & focused</strong></div>
      </div>
      <div style={{display:'flex',height:'calc(100vh - 88px)',gap:0}}>
        <div style={{flex:1,display:'flex',flexDirection:'column',borderRight:'3px solid #ddd'}}>
          <div style={{background:'#4B5563',color:'#fff',padding:'8px 20px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:700,background:'#6B7280',padding:'2px 8px',borderRadius:99}}>CURRENT</span>
            <span style={{fontSize:13,fontWeight:600}}>Step 5: Inventory & Extras</span>
            <span style={{marginLeft:'auto',fontSize:10,color:'#9CA3AF'}}>1 card · 12 fields (mixed) · 6 steps total</span>
          </div>
          <div style={{display:'flex',flex:1,overflow:'hidden',background:C.bg}}>
            <Sidebar steps={OLD_STEPS} active={4} label="OLD WIZARD"/>
            <OldScreen/>
          </div>
          <div style={{background:'#374151',padding:'8px 20px',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
            <button style={{background:C.green,color:'#fff',border:'none',borderRadius:8,padding:'7px 20px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Save & Continue →</button>
          </div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column'}}>
          <div style={{background:C.orange,color:'#fff',padding:'8px 20px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:700,background:'rgba(255,255,255,0.25)',padding:'2px 8px',borderRadius:99}}>PROPOSED</span>
            <span style={{fontSize:13,fontWeight:600}}>Screen 8: Inventory</span>
            <span style={{marginLeft:'auto',fontSize:10,color:'rgba(255,255,255,0.75)'}}>2 cards · 9 steps total</span>
          </div>
          <div style={{display:'flex',flex:1,overflow:'hidden',background:C.bg}}>
            <Sidebar steps={NEW_STEPS} active={7} label="NEW WIZARD"/>
            <NewScreen highlight={highlight}/>
          </div>
          <div style={{background:'#fff',borderTop:`1px solid ${C.border}`,padding:'8px 20px',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
            <button data-testid="screen8-save-continue" style={{background:C.green,color:'#fff',border:'none',borderRadius:8,padding:'7px 20px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Save & Continue →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
