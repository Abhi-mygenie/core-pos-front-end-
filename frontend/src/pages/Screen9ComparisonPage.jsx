// CR-132 Design Review — Screen 9: Room & Hospitality (Before vs After, conditional screen)
import React, { useState } from 'react';

const C = { orange:'#F26B33', orangeLight:'#FDF0EB', green:'#329937', dark:'#1A1A2E', gray:'#6B7280', border:'#E5E7EB', bg:'#F7F7F7', white:'#FFFFFF' };

const NewBadge = () => <span style={{background:C.orangeLight,color:C.orange,border:`1px solid ${C.orange}30`,fontSize:9,fontWeight:800,letterSpacing:1,padding:'1px 6px',borderRadius:99,marginLeft:6,verticalAlign:'middle',textTransform:'uppercase'}}>NEW</span>;
const CondBadge = () => <span style={{background:'#F5F3FF',color:'#7C3AED',border:`1px solid #7C3AED30`,fontSize:9,fontWeight:800,letterSpacing:1,padding:'1px 6px',borderRadius:99,marginLeft:6,verticalAlign:'middle',textTransform:'uppercase'}}>CONDITIONAL</span>;

const Card = ({title,desc,children,allNew,accent}) => (
  <div style={{background:C.white,border:`1.5px solid ${allNew||accent?C.orange+'55':C.border}`,borderRadius:12,marginBottom:16,overflow:'hidden',boxShadow:allNew||accent?`0 0 0 3px ${C.orange}10`:'0 1px 3px rgba(0,0,0,0.06)'}}>
    <div style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,background:allNew?C.orangeLight:C.white}}>
      <div style={{fontSize:14,fontWeight:700,color:C.dark}}>{title}{allNew&&<NewBadge/>}</div>
      {desc&&<div style={{fontSize:11,color:C.gray,marginTop:2}}>{desc}</div>}
    </div>
    <div style={{padding:'16px 20px'}}>{children}</div>
  </div>
);

const TRow = ({label,isNew,hint,type='toggle',options,highlight}) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${C.border}`,background:isNew&&highlight?C.orangeLight:'transparent',margin:isNew?'0 -20px':'0',padding:isNew?'8px 20px':'8px 0'}}>
    <div>
      <span style={{fontSize:12,fontWeight:600,color:C.dark}}>{label}</span>
      {isNew&&<NewBadge/>}
      {hint&&<div style={{fontSize:10,color:C.gray,marginTop:1}}>{hint}</div>}
    </div>
    {type==='toggle'&&<div data-testid={`toggle-${label.toLowerCase().replace(/\s+/g,'-')}`} style={{width:36,height:20,borderRadius:10,background:C.green,position:'relative',flexShrink:0}}><div style={{width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:2,right:2}}/></div>}
    {type==='select'&&<select style={{fontSize:11,border:`1px solid ${C.border}`,borderRadius:6,padding:'3px 8px',flexShrink:0}}>{(options||[]).map(o=><option key={o}>{o}</option>)}</select>}
  </div>
);

const Grid2 = ({children}) => <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>{children}</div>;
const InfoBox = ({color,bg,text}) => <div style={{background:bg,border:`1px solid ${color}30`,borderRadius:8,padding:'8px 14px',marginBottom:16,fontSize:11,color,fontWeight:600}}>{text}</div>;

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
        const isActive=i===active, isDeferred=s.startsWith('⏸'), isCond=s.includes('Room');
        return <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:7,marginBottom:2,background:isActive?C.orangeLight:'transparent',borderLeft:isActive?`3px solid ${C.orange}`:'3px solid transparent',opacity:isDeferred?0.45:1}}>
          <div style={{width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,flexShrink:0,background:isActive?C.orange:C.border,color:isActive?'#fff':C.gray}}>{i+1}</div>
          <div>
            <span style={{fontSize:10,fontWeight:isActive?700:500,color:isActive?C.orange:C.gray,lineHeight:1.3,display:'block'}}>{s.replace('⏸ ','')}{isDeferred?' (deferred)':''}</span>
            {isCond&&<span style={{fontSize:9,color:'#7C3AED'}}>Only if Room=ON</span>}
          </div>
        </div>;
      })}
    </div>
  </div>
);

const OldScreen = () => (
  <div style={{flex:1,overflowY:'auto',padding:'16px 20px 80px'}}>
    <InfoBox color="#6B7280" bg="#F9FAFB" text="Room & Hospitality had NO dedicated screen in the old wizard. The only room-related field was the Room channel toggle in Step 2. All room config fields are new."/>
    <Card title="From Step 2 — Channels & Payments">
      <TRow label="Room" hint="Enable room channel for hotel/resort billing"/>
      <div style={{marginTop:8,padding:'8px 12px',background:'#F9FAFB',borderRadius:8,border:`1px dashed ${C.border}`}}>
        <span style={{fontSize:11,color:C.gray}}>No room configuration options existed beyond this single toggle.</span>
      </div>
    </Card>
  </div>
);

const NewScreen = ({highlight}) => (
  <div style={{flex:1,overflowY:'auto',padding:'16px 20px 80px'}}>
    <div style={{background:'#F5F3FF',border:'1px solid #7C3AED30',borderRadius:8,padding:'8px 14px',marginBottom:16,fontSize:11,color:'#7C3AED',fontWeight:600}}>
      Screen 9 only appears when "Room" channel is turned ON in Screen 3 (Channels & Info).
    </div>

    <Card title="Room Billing" desc="How room charges are handled and billed" allNew>
      <Grid2>
        <TRow label="Room Billing Included" isNew hint="Include room charges in final bill" highlight={highlight}/>
        <TRow label="Pay Via Room" isNew hint="Customers can charge orders to room account" highlight={highlight}/>
        <TRow label="Room Price Override" isNew hint="Allow custom room price at check-in" highlight={highlight}/>
        <TRow label="Room GST Applicable" hint="Apply GST on room charges" highlight={highlight}/>
      </Grid2>
    </Card>

    <Card title="Room Access & Security" desc="OTP and authentication for room orders" allNew>
      <TRow label="Room OTP Required" isNew hint="Require OTP to confirm room-charged orders" highlight={highlight}/>
    </Card>

    <Card title="Guest Details" desc="What information is collected at check-in" allNew>
      <Grid2>
        <TRow label="Collect Guest Details" isNew hint="Capture guest name, phone at check-in" highlight={highlight}/>
        <TRow label="Show Booking Details" isNew hint="Display booking reference on order screen" highlight={highlight}/>
        <TRow label="Billing by Employee" isNew hint="Assign bill responsibility to a specific employee" highlight={highlight}/>
      </Grid2>
    </Card>

  </div>
);

export default function Screen9ComparisonPage() {
  const [highlight,setHighlight] = useState(true);
  return (
    <div style={{minHeight:'100vh',background:'#EAEAEA',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:C.dark,color:'#fff',padding:'10px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <span style={{fontSize:11,color:'#aaa',marginRight:8}}>CR-132 Design Review</span>
          <span style={{fontSize:14,fontWeight:700}}>Screen 9 — Room & Hospitality: Before vs After</span>
          <span style={{marginLeft:10,background:'#7C3AED',color:'#fff',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:99,verticalAlign:'middle',letterSpacing:1}}>CONDITIONAL</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#ccc',cursor:'pointer'}}><input data-testid="highlight-toggle" type="checkbox" checked={highlight} onChange={e=>setHighlight(e.target.checked)}/>Highlight NEW</label>
          <a href="/screen8-compare" style={{fontSize:11,color:'#aaa',textDecoration:'none'}}>← S8</a>
          <a href="/screen1-compare" style={{fontSize:11,color:'#aaa',textDecoration:'none'}}>← Back to S1</a>
          <a href="/settings-preview" style={{fontSize:11,color:C.orange,textDecoration:'none'}}>All screens</a>
        </div>
      </div>
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:'8px 24px',display:'flex',gap:20,alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:10,height:10,borderRadius:2,background:C.orangeLight,border:`1px solid ${C.orange}55`}}/><span style={{fontSize:11,color:C.gray}}>All new fields</span></div>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'#F5F3FF',padding:'3px 10px',borderRadius:99,border:'1px solid #7C3AED30'}}><span style={{fontSize:11,color:'#7C3AED',fontWeight:600}}>Only visible when Room channel is ON (Screen 3)</span></div>
        <div style={{marginLeft:'auto',fontSize:11,color:C.gray}}>OLD: 1 toggle only &nbsp;|&nbsp;<strong style={{color:C.orange}}>NEW: 3 sections, 8 new fields — entirely new screen</strong></div>
      </div>
      <div style={{display:'flex',height:'calc(100vh - 88px)',gap:0}}>
        <div style={{flex:1,display:'flex',flexDirection:'column',borderRight:'3px solid #ddd'}}>
          <div style={{background:'#4B5563',color:'#fff',padding:'8px 20px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:700,background:'#6B7280',padding:'2px 8px',borderRadius:99}}>CURRENT</span>
            <span style={{fontSize:13,fontWeight:600}}>Step 2: Room toggle only</span>
            <span style={{marginLeft:'auto',fontSize:10,color:'#9CA3AF'}}>No dedicated room screen</span>
          </div>
          <div style={{display:'flex',flex:1,overflow:'hidden',background:C.bg}}>
            <Sidebar steps={OLD_STEPS} active={1} label="OLD WIZARD"/>
            <OldScreen/>
          </div>
          <div style={{background:'#374151',padding:'8px 20px',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
            <button style={{background:C.green,color:'#fff',border:'none',borderRadius:8,padding:'7px 20px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Save & Continue →</button>
          </div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column'}}>
          <div style={{background:'#7C3AED',color:'#fff',padding:'8px 20px',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:700,background:'rgba(255,255,255,0.25)',padding:'2px 8px',borderRadius:99}}>PROPOSED</span>
            <span style={{fontSize:13,fontWeight:600}}>Screen 9: Room & Hospitality</span>
            <span style={{marginLeft:'auto',fontSize:10,color:'rgba(255,255,255,0.75)'}}>3 cards · shown only when room=ON</span>
          </div>
          <div style={{display:'flex',flex:1,overflow:'hidden',background:C.bg}}>
            <Sidebar steps={NEW_STEPS} active={8} label="NEW WIZARD"/>
            <NewScreen highlight={highlight}/>
          </div>
          <div style={{background:'#fff',borderTop:`1px solid ${C.border}`,padding:'8px 20px',display:'flex',justifyContent:'flex-end',flexShrink:0}}>
            <button data-testid="screen9-save-continue" style={{background:C.green,color:'#fff',border:'none',borderRadius:8,padding:'7px 20px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Save & Continue →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
