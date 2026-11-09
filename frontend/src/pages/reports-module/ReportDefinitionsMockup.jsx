// CR-035 (2026-06-11) — Report Definitions help page (static, display-only)
// One-page explainer of date bases, TAB terminology and the business-day rule.
// No API calls. Reached via "ⓘ Definitions" links in report headers.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Wallet, Scale, HelpCircle } from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';

const BASES = [
  { screen: 'Sales / Payments / Dashboard', basis: 'Collection date', detail: 'Money is counted on the business day it was COLLECTED. Includes room food. TAB credit counts on the day it is settled — not the day it is given.' },
  { screen: 'Items & Menu', basis: 'Punch date', detail: 'Items are counted on the business day they were ORDERED (punched), regardless of when the bill was collected.' },
  { screen: 'Cancellations', basis: 'Cancel date', detail: 'Losses are counted on the business day of the CANCELLATION. An item ordered Monday and cancelled Wednesday appears on Wednesday.' },
  { screen: 'Order Ledger', basis: 'Punch date', detail: 'Operational view — orders listed by the day they were punched.' },
  { screen: 'Settlement report', basis: '"Sold" basis', detail: 'Counts TAB on the day credit is GIVEN (not settled). By design it will not match Sales — Sales answers "what did we collect", Settlement answers "what did we sell".' },
];

const TAB_TERMS = [
  { term: 'Added to Credit', where: 'Items & Menu tab', meaning: 'Food given on TAB — punched value, money NOT received yet.' },
  { term: 'Credit Settled', where: 'Sales / Payments ("Credit" group)', meaning: 'Old TAB credit paid back today (Credit Cash / Card / UPI). This IS revenue, on the settlement day.' },
  { term: 'Credit Outstanding', where: 'Dashboard tile', meaning: 'Total all customers still owe you — always as of TODAY, whatever date range is selected.' },
];

const VALUATION = [
  'Cancelled item loss = item price × qty + add-ons + variations + tax on the line.',
  'Complimentary (comp) items are valued at their menu price (complementary_price) — including comp items that get cancelled.',
  'Fully-cancelled orders use the amount captured at cancel time when the system recorded one; otherwise the sum of the cancelled lines.',
];

const ReportDefinitionsMockup = () => {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-4 px-8 py-5 bg-white border-b border-zinc-200 shrink-0" data-testid="definitions-header">
          <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors" data-testid="definitions-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-0.5">Insights › Help</div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Report Definitions
            </h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-6 space-y-6" data-testid="definitions-content">
          {/* Business day rule */}
          <section className="bg-white border border-zinc-200 rounded-xl p-5" data-testid="definitions-business-day">
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">The business day</h2>
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed">
              A business day runs from <strong>6:00 AM to 3:00 AM the next morning</strong>. Anything that happens between
              midnight and 3:00 AM belongs to the <strong>previous</strong> day. Example: a bill collected Tuesday 1:15 AM
              counts in <strong>Monday's</strong> numbers — on every report.
            </p>
          </section>

          {/* Date basis per screen */}
          <section className="bg-white border border-zinc-200 rounded-xl p-5" data-testid="definitions-bases">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Which date each report uses</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 border-b border-zinc-200">
                  <th className="py-2 pr-4 w-56">Report</th>
                  <th className="py-2 pr-4 w-36">Counts by</th>
                  <th className="py-2">What that means</th>
                </tr>
              </thead>
              <tbody>
                {BASES.map((b) => (
                  <tr key={b.screen} className="border-b border-zinc-100 align-top">
                    <td className="py-2.5 pr-4 font-medium text-zinc-900">{b.screen}</td>
                    <td className="py-2.5 pr-4"><span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium whitespace-nowrap">{b.basis}</span></td>
                    <td className="py-2.5 text-zinc-600 leading-relaxed">{b.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* TAB terminology */}
          <section className="bg-white border border-zinc-200 rounded-xl p-5" data-testid="definitions-tab-terms">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">The three TAB (credit) numbers</h2>
            </div>
            <div className="space-y-3">
              {TAB_TERMS.map((t) => (
                <div key={t.term} className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 inline-block px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold whitespace-nowrap">{t.term}</span>
                  <p className="text-sm text-zinc-600 leading-relaxed"><span className="text-zinc-400 text-xs">({t.where})</span> {t.meaning}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-100">
              The same rupee never appears twice: a TAB sale shows in <em>Added to Credit</em> when given,
              moves to <em>Credit Settled</em> when paid back, and reduces <em>Credit Outstanding</em> at the same moment.
            </p>
          </section>

          {/* Cancellation valuation + why screens differ */}
          <section className="bg-white border border-zinc-200 rounded-xl p-5" data-testid="definitions-cancellation">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">How cancellation losses are valued</h2>
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-zinc-600 leading-relaxed">
              {VALUATION.map((v) => <li key={v}>{v}</li>)}
            </ul>
            <div className="mt-4 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
              <p className="text-xs text-zinc-600 leading-relaxed" data-testid="definitions-worked-example">
                <strong>Worked example — one order, three reports:</strong> a table orders ₹1,000 on Monday night,
                one ₹200 dish is cancelled at 11 PM, and the ₹800 bill is collected Tuesday 1 AM.
                → <strong>Items & Menu</strong>: Monday (punched). <strong>Cancellations</strong>: ₹200 on Monday (cancel time).
                <strong> Sales</strong>: ₹800 on Monday — collected 1 AM, still Monday's business day.
                If instead it were collected Tuesday lunch, Sales would show it on Tuesday while Items still shows Monday.
                Different days, same truth.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default ReportDefinitionsMockup;
