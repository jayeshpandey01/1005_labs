#!/usr/bin/env python3
"""PJP November simulator: plays your plan out day by day and scores it.

Every working day of November 2026 the simulator
  1. executes each SO's plan for the day: visits in your `sequence` order, with real travel time from the SO's start
     point, a 25-minute call, and time held back for the 2 demand-generation calls. Rain or traffic caps a day at
     5 dealer visits (instead of 6) and slows travel. Dealers are sometimes unavailable.
  2. simulates each dealer's sales for the day from its own history. Hidden events happen: some dealers' sales DROP
     sharply (a visit within a week recovers them), others HIKE (a planned visit can safely be cancelled).
  3. in the evening calls YOUR re-plan command with what happened, today's sales and tomorrow's weather forecast,
     and replaces the rest of the month with the plan it returns.
At the end it reports simulated adherence, focus coverage, drop response, guardrail breaches, travel and points.

Usage
  python simulate.py --workbook PJP_Assignment_Sample_Data.xlsx --plan plan_november.csv \
      --replan-cmd "python -m mypjp.replan" --seed 1 --out results/

Plan CSV (initial plan and every re-plan output): one row per visit, columns
  date (YYYY-MM-DD), so_id, sequence (1 = first visit of the day), account_id, account_type
Extra columns (planned_arrival, travel_min_from_previous, reason, ...) are allowed and ignored. Only dealer visits
(account_id present in the Dealers sheet) are simulated; demand-generation time is reserved automatically.

Re-plan contract: after each working day the simulator runs
  <replan-cmd> --state STATE.json --plan CURRENT_PLAN.csv --out NEXT_PLAN.csv
and expects NEXT_PLAN.csv to hold the full plan for every SO from the next working day to 30 Nov. Rows dated on or
before today are ignored. If the command fails, times out (120 s) or writes nothing, the current plan is kept and a
failure is counted. STATE.json is documented in README.md.

Practice seeds: 1, 2, 3. Scoring uses other, unpublished seeds; the event rates and rules are the same.
Requires Python 3.9+ and openpyxl.
"""
import argparse, csv, hashlib, json, math, random, shlex, subprocess, sys, tempfile, datetime as DT, collections as C, statistics as st
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit('pip install openpyxl')

CFG = {
    'day_start': '09:30', 'day_minutes': 540,                 # 09:30-18:30
    'dg_calls_per_day': 2, 'dg_minutes_each': 40,            # 25-min call + ~15 min travel, reserved every day
    'call_minutes': 25, 'unavailable_minutes': 10,
    'dealer_visits_per_day': 6, 'disrupted_visits_per_day': 5,
    'speed_kmh': {'metro': 18, 'upcountry': 30}, 'road_factor': 1.35,
    'unknown_location_travel_min': {'metro': 25, 'upcountry': 45},
    'travel_mult': {'clear': 1.0, 'rain': 1.5, 'traffic': 1.3},
    'p_rain': {'metro': 0.15, 'upcountry': 0.08}, 'p_traffic': {'metro': 0.10, 'upcountry': 0.05},
    'forecast_accuracy': 0.8, 'p_dealer_unavailable': 0.03,
    'active_min_sheets_per_day': 0.5,                         # dealers below this rarely buy; no events for them
    'p_drop': 0.10, 'drop_factor': 0.25, 'drop_response_days': 7, 'recovery_days': 3,
    'p_hike': 0.08, 'hike_factor': 2.2, 'hike_days': 10,
    'visit_uplift': 1.08, 'visit_uplift_days': 14,
    'max_visits_per_dealer_month': 2, 'club_min_gap_days': 10,
    'history_window': ('2026-07-16', '2026-10-15'), 'replan_timeout_s': 120,
}
MONTH = [DT.date(2026, 11, d) for d in range(1, 31)]
WORKDAYS = [d for d in MONTH if d.weekday() != 6]


def krng(*key):
    """Deterministic RNG per (seed, ..., key) so outcomes do not depend on the plan's order of evaluation."""
    return random.Random(int(hashlib.sha256('|'.join(map(str, key)).encode()).hexdigest()[:16], 16))


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


# ---------------------------------------------------------------- data
def read_sheet(wb, name):
    ws = wb[name]
    rows = ws.iter_rows(values_only=True)
    head = None
    for r in rows:                         # some sheets have a note row before the header
        if r and r[0] is not None and r[1] is not None:
            head = [str(h) for h in r]; break
    return [dict(zip(head, r)) for r in rows if r and r[0] is not None]


def load(workbook):
    wb = openpyxl.load_workbook(workbook, read_only=True, data_only=True)
    officers = {o['so_id']: o for o in read_sheet(wb, 'Officers')}
    for o in officers.values():
        o['kind'] = 'upcountry' if 'upcountry' in str(o['geography']).lower() else 'metro'
        o['start'] = (float(o['approx_day_start_lat']), float(o['approx_day_start_lon']))
    dealers = {}
    for d in read_sheet(wb, 'Dealers'):
        dealers[d['dealer_id']] = {'so_id': d['so_id'], 'club': d['loyalty_club_member'] == 'Yes',
                                   'loc': (float(d['lat']), float(d['lon'])) if d['lat'] is not None else None}
    a, b = (DT.date.fromisoformat(x) for x in CFG['history_window'])
    n_work = sum(1 for i in range((b - a).days + 1) if (a + DT.timedelta(i)).weekday() != 6)
    sheets, points = C.Counter(), C.Counter()
    for s in read_sheet(wb, 'Sales_Daily'):
        day = s['date'].date() if hasattr(s['date'], 'date') else DT.date.fromisoformat(str(s['date'])[:10])
        if a <= day <= b and s['dealer_id'] in dealers:
            sheets[s['dealer_id']] += s['sheets'] or 0
            points[s['dealer_id']] += (s['sheets'] or 0) * (s['points_per_sheet'] or 0)
    for did, d in dealers.items():
        d['rate'] = max(0.0, sheets[did] / n_work)                 # sheets per working day
        d['pps'] = points[did] / sheets[did] if sheets[did] > 0 else 2.0
    return officers, dealers


# ---------------------------------------------------------------- world (hidden, seeded)
def make_world(seed, officers, dealers):
    weather, forecast = {}, {}
    for so, o in officers.items():
        for d in WORKDAYS:
            r = krng(seed, 'wx', so, d).random()
            w = 'rain' if r < CFG['p_rain'][o['kind']] else 'traffic' if r < CFG['p_rain'][o['kind']] + CFG['p_traffic'][o['kind']] else 'clear'
            weather[(so, d)] = w
            fr = krng(seed, 'fc', so, d)
            forecast[(so, d)] = w if fr.random() < CFG['forecast_accuracy'] else fr.choice([x for x in ('clear', 'rain', 'traffic') if x != w])
    events = {}
    for did, d in sorted(dealers.items()):
        if d['rate'] < CFG['active_min_sheets_per_day']:
            continue
        r = krng(seed, 'ev', did)
        x = r.random()
        if x < CFG['p_drop']:
            events[did] = {'type': 'drop', 'onset': WORKDAYS[r.randrange(0, len(WORKDAYS) - 6)]}
        elif x < CFG['p_drop'] + CFG['p_hike']:
            onset = WORKDAYS[r.randrange(0, len(WORKDAYS) - 4)]
            events[did] = {'type': 'hike', 'onset': onset, 'end': onset + DT.timedelta(days=CFG['hike_days'])}
    return weather, forecast, events


def sales_today(seed, did, d, day, ev, last_visit, recovered_on):
    if day.weekday() == 6 or d['rate'] <= 0:
        return 0
    f = 1.0
    if ev and ev['type'] == 'drop' and day >= ev['onset']:
        if recovered_on is None or day <= recovered_on:
            f *= CFG['drop_factor']
        else:
            ramp = min(1.0, (day - recovered_on).days / CFG['recovery_days'])
            f *= CFG['drop_factor'] + (1 - CFG['drop_factor']) * ramp
    if ev and ev['type'] == 'hike' and ev['onset'] <= day < ev['end']:
        f *= CFG['hike_factor']
    if last_visit and 0 < (day - last_visit).days <= CFG['visit_uplift_days']:
        f *= CFG['visit_uplift']
    r = krng(seed, 'sale', did, day)
    mean = d['rate'] * f * r.gammavariate(2.0, 0.5)              # noisy daily demand
    return int(mean) + (1 if r.random() < mean - int(mean) else 0)


# ---------------------------------------------------------------- plans
def read_plan(path, dealers):
    rows = []
    with open(path, newline='', encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            try:
                day = DT.date.fromisoformat(r['date'].strip()[:10])
                rows.append({'date': day, 'so_id': r['so_id'].strip(), 'sequence': float(r.get('sequence') or 0),
                             'account_id': r['account_id'].strip()})
            except (KeyError, ValueError, AttributeError):
                continue
    return [r for r in rows if r['account_id'] in dealers]


def write_plan(path, rows):
    with open(path, 'w', newline='') as f:
        w = csv.writer(f); w.writerow(['date', 'so_id', 'sequence', 'account_id', 'account_type'])
        for r in sorted(rows, key=lambda r: (r['date'], r['so_id'], r['sequence'])):
            w.writerow([r['date'].isoformat(), r['so_id'], int(r['sequence']) if r['sequence'] == int(r['sequence']) else r['sequence'], r['account_id'], 'Dealer'])


# ---------------------------------------------------------------- simulation
def run(args):
    officers, dealers = load(args.workbook)
    weather, forecast, events = make_world(args.seed, officers, dealers)
    plan = read_plan(args.plan, dealers)
    initial = {(r['date'], r['account_id']) for r in plan}
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix='pjp_sim_'))
    visits, daily, breaches, failures, cancelled = [], [], C.Counter(), [], []
    last_visit, recovered_on, completed_by_dealer = {}, {}, C.defaultdict(list)
    sales_log = []
    for day in MONTH:
        todays = []
        if day.weekday() != 6:
            for so, o in officers.items():
                rows = sorted([r for r in plan if r['date'] == day and r['so_id'] == so], key=lambda r: r['sequence'])
                w = weather[(so, day)]
                cap = CFG['disrupted_visits_per_day'] if w != 'clear' else CFG['dealer_visits_per_day']
                if len(rows) > CFG['dealer_visits_per_day']:
                    breaches['more_than_6_dealer_visits_planned_in_a_day'] += 1
                budget = CFG['day_minutes'] - CFG['dg_calls_per_day'] * CFG['dg_minutes_each']
                used, pos, done, travel_total = 0.0, o['start'], 0, 0.0
                for r in rows:
                    d = dealers[r['account_id']]
                    if d['so_id'] != so:
                        breaches['visit_planned_for_another_sos_dealer'] += 1
                    if d['loc'] is None:
                        t = CFG['unknown_location_travel_min'][o['kind']]
                        nxt = pos
                    else:
                        t = km(pos, d['loc']) * CFG['road_factor'] / CFG['speed_kmh'][o['kind']] * 60
                        nxt = d['loc']
                    t *= CFG['travel_mult'][w]
                    status = 'completed'
                    if done >= cap:
                        status = 'missed_weather' if w != 'clear' else 'missed_over_daily_limit'
                    elif used + t + CFG['call_minutes'] > budget:
                        status = 'missed_out_of_time'
                    elif krng(args.seed, 'unavail', r['account_id'], day).random() < CFG['p_dealer_unavailable']:
                        status = 'missed_dealer_unavailable'
                        used += t + CFG['unavailable_minutes']; travel_total += t; pos = nxt
                    else:
                        used += t + CFG['call_minutes']; travel_total += t; pos = nxt; done += 1
                        last_visit[r['account_id']] = day
                        completed_by_dealer[r['account_id']].append(day)
                        ev = events.get(r['account_id'])
                        if ev and ev['type'] == 'drop' and day >= ev['onset'] and r['account_id'] not in recovered_on:
                            recovered_on[r['account_id']] = day
                    v = {'date': day.isoformat(), 'so_id': so, 'sequence': r['sequence'], 'account_id': r['account_id'],
                         'weather': w, 'status': status, 'travel_min': round(t, 1), 'in_initial_plan': (day, r['account_id']) in initial}
                    visits.append(v); todays.append(v)
                daily.append({'date': day.isoformat(), 'so_id': so, 'weather': w, 'planned': len(rows), 'completed': done,
                              'travel_min': round(travel_total, 1), 'minutes_used': round(used, 1)})
        # sales for every dealer today
        sales = []
        for did, d in dealers.items():
            q = sales_today(args.seed, did, d, day, events.get(did), last_visit.get(did), recovered_on.get(did))
            if q:
                sales.append({'dealer_id': did, 'sheets': q, 'points': round(q * d['pps'], 1)})
        sales_log.extend({'date': day.isoformat(), **s} for s in sales)
        # evening re-plan
        nxt_day = next((w for w in WORKDAYS if w > day), None)
        if nxt_day is None or day.weekday() == 6 or not args.replan_cmd:
            continue
        state = {'today': day.isoformat(), 'next_working_day': nxt_day.isoformat(),
                 'weather_today': {so: weather[(so, day)] for so in officers},
                 'weather_forecast_next_working_day': {so: forecast[(so, nxt_day)] for so in officers},
                 'visits_today': todays, 'sales_today': sales,
                 'completed_visits_month_to_date': [{'date': x.isoformat(), 'account_id': a} for a, ds in completed_by_dealer.items() for x in ds],
                 'rules': {k: CFG[k] for k in ('dealer_visits_per_day', 'disrupted_visits_per_day', 'max_visits_per_dealer_month', 'club_min_gap_days')}}
        sp, cp, np_ = work / f'state_{day}.json', work / f'plan_{day}.csv', work / f'next_{day}.csv'
        sp.write_text(json.dumps(state)); write_plan(cp, [r for r in plan if r['date'] > day])
        try:
            res = subprocess.run(shlex.split(args.replan_cmd) + ['--state', str(sp), '--plan', str(cp), '--out', str(np_)],
                                 capture_output=True, text=True, timeout=CFG['replan_timeout_s'])
            if res.returncode != 0 or not np_.exists():
                raise RuntimeError(f'exit {res.returncode}: {res.stderr[-300:]}')
            new = [r for r in read_plan(np_, dealers) if r['date'] > day]
            before = {(r['date'], r['account_id']) for r in plan if r['date'] > day}
            after = {(r['date'], r['account_id']) for r in new}
            cancelled.extend({'decided_on': day.isoformat(), 'date': d.isoformat(), 'account_id': a} for d, a in before - after)
            plan = [r for r in plan if r['date'] <= day] + new
        except Exception as e:  # keep the current plan
            failures.append({'date': day.isoformat(), 'error': str(e)[:300]})
    # ---------------------------------------------------------------- scoring
    planned = sum(x['planned'] for x in daily)
    completed = [v for v in visits if v['status'] == 'completed']
    init_n = len(initial)
    init_done = sum(1 for v in completed if v['in_initial_plan'])
    focus = {a for _, a in initial}
    need = {a: (2 if dealers[a]['club'] else 1) for a in focus}
    covered = sum(1 for a in focus if len(completed_by_dealer.get(a, [])) >= need[a])
    club = [a for a in focus if dealers[a]['club']]
    club_ok = sum(1 for a in club if len(completed_by_dealer.get(a, [])) >= 2 and
                  (sorted(completed_by_dealer[a])[1] - sorted(completed_by_dealer[a])[0]).days >= CFG['club_min_gap_days'])
    for a, ds in completed_by_dealer.items():
        if len(ds) > CFG['max_visits_per_dealer_month']:
            breaches['dealer_visited_more_than_twice'] += 1
    drops = [(a, e) for a, e in events.items() if e['type'] == 'drop']
    resp = []
    for a, e in drops:
        dd = [(x - e['onset']).days for x in completed_by_dealer.get(a, []) if x >= e['onset']]
        resp.append(min(dd) if dd else None)
    hikes = [(a, e) for a, e in events.items() if e['type'] == 'hike']
    hike_visits = sum(1 for a, e in hikes for x in completed_by_dealer.get(a, []) if e['onset'] < x < e['end'])
    hike_cancelled = sum(1 for c in cancelled if c['account_id'] in dict(hikes) and
                         dict(hikes)[c['account_id']]['onset'] <= DT.date.fromisoformat(c['decided_on']) < dict(hikes)[c['account_id']]['end'])
    reasons = C.Counter(v['status'] for v in visits)
    pts = sum(s['points'] for s in sales_log)
    summary = {
        'seed': args.seed,
        'simulated_adherence': round(len(completed) / planned, 4) if planned else None,
        'initial_plan_adherence': round(init_done / init_n, 4) if init_n else None,
        'focus_dealers': len(focus), 'focus_coverage': round(covered / len(focus), 4) if focus else None,
        'club_dealers_in_focus': len(club), 'club_cadence_met': round(club_ok / len(club), 4) if club else None,
        'drop_events': len(drops), 'drops_visited_within_7_days': sum(1 for x in resp if x is not None and x <= CFG['drop_response_days']),
        'drop_response_rate': round(sum(1 for x in resp if x is not None and x <= CFG['drop_response_days']) / len(drops), 4) if drops else None,
        'median_days_to_drop_visit': st.median([x for x in resp if x is not None]) if any(x is not None for x in resp) else None,
        'hike_events': len(hikes), 'visits_made_during_hikes': hike_visits, 'visits_cancelled_during_hikes': hike_cancelled,
        'visits_planned_day_of': planned, 'visits_completed': len(completed),
        'missed_by_reason': {k: v for k, v in reasons.items() if k != 'completed'},
        'avg_travel_min_per_so_day': round(st.mean(x['travel_min'] for x in daily), 1) if daily else None,
        'avg_completed_per_so_day': round(st.mean(x['completed'] for x in daily), 2) if daily else None,
        'guardrail_breaches': dict(breaches), 'replan_failures': len(failures),
        'simulated_points_november': round(pts),
    }
    (out / 'summary.json').write_text(json.dumps(summary, indent=1))
    for name, rows in (('visits.csv', visits), ('daily.csv', daily), ('cancellations.csv', cancelled), ('replan_failures.csv', failures)):
        with open(out / name, 'w', newline='') as f:
            if rows:
                w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    with open(out / 'events_revealed.csv', 'w', newline='') as f:   # ground truth, for debugging after the run
        w = csv.writer(f); w.writerow(['dealer_id', 'type', 'onset', 'end', 'first_visit_after_onset'])
        for a, e in sorted(events.items()):
            after = [x for x in completed_by_dealer.get(a, []) if x >= e['onset']]
            w.writerow([a, e['type'], e['onset'], e.get('end', ''), min(after) if after else ''])
    print(json.dumps(summary, indent=1))
    return summary


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    p.add_argument('--workbook', required=True); p.add_argument('--plan', required=True)
    p.add_argument('--replan-cmd', default='', help='command to call each evening; omit to test a static plan')
    p.add_argument('--seed', type=int, default=1); p.add_argument('--out', default='sim_results')
    run(p.parse_args())
