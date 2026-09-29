// V87 PDF document generation + attachment queue
function v87Money(n){return Number(n||0).toFixed(2)+" EUR"}
async function v185PdfLogo(doc,company={}){
  try{
    const p=require("path").join(__dirname,"emergency-delivery-logo.png");
    const fs=require("fs");
    if(fs.existsSync(p)) doc.image(p,48,24,{fit:[170,88],align:"left",valign:"top"});
    const lines=[company.company_name||"Emergency Delivery",[company.address,company.postal_code,company.city].filter(Boolean).join(", "),company.country||"",company.phone?`Tel. ${company.phone}`:"",company.email||"",company.website||""];
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#172033").text(lines[0],330,34,{width:215,align:"left"});
    doc.font("Helvetica").fontSize(8.5);
    lines.slice(1).filter(Boolean).forEach((line,i)=>doc.text(line,330,50+i*12,{width:215}));
    doc.save();doc.strokeColor("#d6a33a").lineWidth(1.2).moveTo(48,118).lineTo(547,118).stroke();doc.restore();
  }catch(_){}
  doc.y=Math.max(doc.y,128);
}
function v189DateOnly(value){
  if(!value)return "";
  const s=String(value);
  if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
  const d=new Date(value);
  return Number.isNaN(d.getTime())?s:d.toISOString().slice(0,10);
}
function v189Cell(value){
  return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
async function v87BuildInvoicePdf(inv){
  const PDFDocument=require("pdfkit"); const chunks=[]; const doc=new PDFDocument({size:"A4",margin:42,bufferPages:true,pageLayout:"singlePage"});
  doc.on("data",c=>chunks.push(c)); const done=new Promise(r=>doc.on("end",r));
  const company=(await q("select * from company_settings where id=1"))[0]||{};
  v185PdfLogo(doc,company);

  doc.fontSize(20).font("Helvetica-Bold").text(company.company_name||"Emergency Delivery");
  doc.moveDown(0.35).fontSize(18).text("RECHNUNG");
  doc.moveDown(0.7).font("Helvetica").fontSize(10);

  const infoTop=doc.y;
  doc.rect(48,infoTop,499,70).strokeColor("#d0d5dd").stroke();
  doc.font("Helvetica-Bold").text("Rechnungsdaten",60,infoTop+12);
  doc.font("Helvetica").text(`Rechnungsnummer: ${inv.invoice_number||"—"}`,60,infoTop+30);
  doc.text(`Rechnungsdatum: ${v189DateOnly(inv.issue_date)||"—"}`,60,infoTop+46);
  doc.text(`Fälligkeitsdatum: ${v189DateOnly(inv.due_date)||"—"}`,310,infoTop+30);
  doc.text(`Status: ${inv.status||"—"}`,310,infoTop+46);
  doc.y=infoTop+84;

  const customerTop=doc.y;
  doc.rect(48,customerTop,499,78).strokeColor("#d0d5dd").stroke();
  doc.font("Helvetica-Bold").text("Kunde",60,customerTop+12);
  doc.font("Helvetica").text(inv.customer_company||"—",60,customerTop+30);
  doc.text(inv.customer_vat||"",60,customerTop+46);
  doc.text(`Tour: ${inv.trip_number||"—"}`,310,customerTop+30);
  doc.y=customerTop+92;

  const tableTop=doc.y;
  const x=[48,350,415,481,547];
  const widths=[302,65,66,66];
  doc.rect(48,tableTop,499,28).fillAndStroke("#f2f4f7","#d0d5dd");
  doc.fillColor("#172033").font("Helvetica-Bold").fontSize(9);
  doc.text("Leistung / Beschreibung",58,tableTop+9);
  doc.text("Netto",x[1]+6,tableTop+9,{width:50,align:"right"});
  doc.text("MwSt.",x[2]+6,tableTop+9,{width:50,align:"right"});
  doc.text("Brutto",x[3]+6,tableTop+9,{width:55,align:"right"});
  doc.fillColor("#172033").font("Helvetica").fontSize(9);
  doc.rect(48,tableTop+28,499,40).strokeColor("#d0d5dd").stroke();
  doc.text(inv.description||"Transportleistung",58,tableTop+43,{width:285});
  doc.text(v87Money(inv.net),x[1]+6,tableTop+43,{width:50,align:"right"});
  doc.text(`${Number(inv.vat_rate||0).toFixed(2)}%`,x[2]+6,tableTop+43,{width:50,align:"right"});
  doc.text(v87Money(inv.gross),x[3]+6,tableTop+43,{width:55,align:"right"});
  doc.y=tableTop+84;

  const sumTop=doc.y;
  doc.rect(300,sumTop,247,92).strokeColor("#d0d5dd").stroke();
  doc.font("Helvetica").fontSize(10).text("Nettobetrag",315,sumTop+14);
  doc.text(v87Money(inv.net),420,sumTop+14,{width:110,align:"right"});
  doc.text(`MwSt. ${Number(inv.vat_rate||0).toFixed(2)}%`,315,sumTop+35);
  doc.text(v87Money(inv.vat),420,sumTop+35,{width:110,align:"right"});
  doc.font("Helvetica-Bold").fontSize(12).text("Gesamtbetrag",315,sumTop+62);
  doc.text(v87Money(inv.gross),420,sumTop+62,{width:110,align:"right"});
  doc.y=sumTop+110;
  const footer=[company.company_name,company.legal_name, [company.address,company.postal_code,company.city].filter(Boolean).join(", "), company.vat_id?`P.IVA: ${company.vat_id}`:"", company.iban?`IBAN: ${company.iban}`:"", company.footer_note||""];
  doc.fillColor("#172033").fontSize(7).text(footer.filter(Boolean).join(" · "),48,doc.page.height-50,{width:499,align:"center",height:24,lineBreak:false});
  doc.end(); await done; return Buffer.concat(chunks)
}
async function v87BuildDdtPdf(t,stops,ddt){
  const PDFDocument=require("pdfkit"); const chunks=[]; const doc=new PDFDocument({size:"A4",margin:48});
  doc.on("data",c=>chunks.push(c)); const done=new Promise(r=>doc.on("end",r));
  const company=(await q("select * from company_settings where id=1"))[0]||{};
  v185PdfLogo(doc,company);

  doc.fontSize(20).font("Helvetica-Bold").text(company.company_name||"Emergency Delivery");
  doc.moveDown(0.35).fontSize(18).text("LIEFERSCHEIN");
  doc.moveDown(0.7).font("Helvetica").fontSize(10);

  const infoTop=doc.y;
  doc.rect(48,infoTop,499,92).strokeColor("#d0d5dd").stroke();
  doc.font("Helvetica-Bold").text("Lieferscheindaten",60,infoTop+12);
  doc.font("Helvetica").text(`Lieferscheinnummer: ${ddt.document_number||"—"}`,60,infoTop+30);
  doc.text(`Datum: ${v189DateOnly(ddt.issued_at)||v189DateOnly(new Date())}`,60,infoTop+46);
  doc.text(`Tour: ${t.trip_number||"—"}`,310,infoTop+30);
  doc.text(`Status: ${ddt.status||"—"}`,310,infoTop+46);
  doc.font("Helvetica-Bold").text("Kunde",60,infoTop+66);
  doc.font("Helvetica").text(t.customer_company||"—",110,infoTop+66,{width:420});
  doc.y=infoTop+108;

  const tableTop=doc.y;
  const cols=[48,78,250,410,474,547];
  doc.rect(48,tableTop,499,30).fillAndStroke("#f2f4f7","#d0d5dd");
  doc.fillColor("#172033").font("Helvetica-Bold").fontSize(8);
  doc.text("Pos.",54,tableTop+10,{width:20});
  doc.text("Empfänger",82,tableTop+10,{width:160});
  doc.text("Lieferadresse",254,tableTop+10,{width:150});
  doc.text("KG",414,tableTop+10,{width:45,align:"right"});
  doc.text("Stück",478,tableTop+10,{width:55,align:"right"});

  const rows=stops.length?stops:[{customer_name:t.customer_company||"—",address:"",delivered_kg:t.weight_kg||0,delivered_pieces:t.pieces||0,status:t.status||"—"}];
  // One-page DDT layout: shrink rows/font instead of creating a second page.
  const footerY=doc.page.height-52;
  const transportY=footerY-70;
  const available=Math.max(90,transportY-(tableTop+30)-34);
  const rowH=Math.max(12,Math.min(42,Math.floor(available/Math.max(1,rows.length))));
  const rowFont=rowH<=16?5.5:rowH<=22?6.5:8;
  let y=tableTop+30;
  doc.font("Helvetica").fontSize(rowFont);
  rows.forEach((x,i)=>{
    doc.rect(48,y,499,rowH).strokeColor("#d0d5dd").stroke();
    doc.fillColor("#172033");
    const ty=y+Math.max(3,Math.floor((rowH-rowFont)/2));
    doc.text(String(i+1),54,ty,{width:20});
    doc.text(x.customer_name||"—",82,y+3,{width:160,height:Math.max(8,rowH-6),ellipsis:true});
    doc.text(x.address||"—",254,y+3,{width:150,height:Math.max(8,rowH-6),ellipsis:true});
    doc.text(String(x.delivered_kg??0),414,ty,{width:45,align:"right"});
    doc.text(String(x.delivered_pieces??0),478,ty,{width:55,align:"right"});
    y+=rowH;
  });
  const transportTop=Math.min(y+10,transportY-46);
  doc.font("Helvetica-Bold").fontSize(10).text("Transportdaten",48,transportTop);
  doc.font("Helvetica").fontSize(9).text(`Fahrer: ${t.driver_name||"—"}`,48,transportTop+18);
  doc.text(`Fahrzeug: ${[t.vehicle_name,t.plate].filter(Boolean).join(" · ")||"—"}`,280,transportTop+18);
  doc.fontSize(8).fillColor("#667085").text("Der Lieferschein enthält keine Uhrzeiten.",48,transportTop+40);
  const footer=[company.company_name,company.legal_name,[company.address,company.postal_code,company.city].filter(Boolean).join(", "),company.vat_id?`P.IVA: ${company.vat_id}`:"",company.phone?`Tel. ${company.phone}`:"",company.email||"",company.footer_note||""];
  doc.fillColor("#172033").fontSize(7).text(footer.filter(Boolean).join(" · "),48,footerY,{width:499,align:"center"});
  doc.end(); await done; return Buffer.concat(chunks)
}

// V181 – direkte PDF-Downloads für DDT und Rechnungen
function v181Filename(name){return String(name||"dokument").replace(/[^a-zA-Z0-9._-]+/g,"_")}
app.get("/api/documents/invoice/:id/pdf",auth,async(req,res)=>{
  try{
    const inv=(await q(`select i.*,c.company customer_company,c.vat_id customer_vat,t.trip_number
      from invoices i left join customers c on c.id=i.customer_id left join trips t on t.id=i.trip_id
      where i.id=$1`,[req.params.id]))[0];
    if(!inv)return res.status(404).json({error:"Rechnung nicht gefunden"});
    const pdf=await v87BuildInvoicePdf(inv);
    res.set("Content-Type","application/pdf");
    res.set("Content-Disposition",`attachment; filename="${v181Filename(inv.invoice_number)}.pdf"`);
    res.send(pdf);
  }catch(e){res.status(500).json({error:e.message})}
});
app.get("/api/documents/ddt/:id/pdf",auth,async(req,res)=>{
  await q(`CREATE TABLE IF NOT EXISTS delivery_documents(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id uuid UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
    document_number text UNIQUE NOT NULL,
    issued_at timestamptz DEFAULT now(),
    status text DEFAULT 'Open',
    proof_complete boolean DEFAULT false
  )`);

  try{
    const t=(await q(`select t.*,c.company customer_company,c.vat_id customer_vat,
      u.name driver_name,v.name vehicle_name,v.plate
      from trips t left join customers c on c.id=t.customer_id
      left join users u on u.id=t.driver_id left join vehicles v on v.id=t.vehicle_id
      where t.id=$1`,[req.params.id]))[0];
    if(!t)return res.status(404).json({error:"Auftrag/Tour nicht gefunden"});
    let ddt=(await q("select * from delivery_documents where trip_id=$1",[t.id]))[0];
    if(!ddt){
      const n=await q(`select 'DDT-'||extract(year from current_date)::int||'-'||lpad(
        (coalesce(max(cast(split_part(document_number,'-',3) as int)),0)+1)::text,4,'0') n
        from delivery_documents`);
      ddt=(await q("insert into delivery_documents(trip_id,document_number,proof_complete,status) values($1,$2,$3,$4) returning *",
        [t.id,n[0].n,t.status==="Delivered",t.status==="Delivered"?"Completed":"Open"]))[0];
    }
    const stops=await q("select * from trip_stops where trip_id=$1 order by stop_order",[t.id]);
    const pdf=await v87BuildDdtPdf(t,stops,ddt);
    res.set("Content-Type","application/pdf");
    res.set("Content-Disposition",`attachment; filename="${v181Filename(ddt.document_number)}.pdf"`);
    res.send(pdf);
  }catch(e){res.status(500).json({error:e.message})}
});

app.post("/api/documents/send-pdf-v87/:tripId",auth,roles("Admin","Dispatcher","Accounting"),async(req,res)=>{