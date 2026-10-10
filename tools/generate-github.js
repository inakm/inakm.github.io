/**
 * generate-github.js
 *
 * Builds assets/data/github.json for the homepage "05 / Open Source" section.
 *
 * Uses the public GitHub REST API for profile stats, repositories and recent
 * public activity. If a token is present (GITHUB_TOKEN / GH_TOKEN - a GitHub
 * Action supplies one automatically) it also pulls the full 1-year contribution
 * calendar over GraphQL, which the REST API does not expose.
 *
 * Without a token the heatmap falls back to the ~90 days of history the public
 * events API covers, and the payload is marked source:"events" so the page can
 * label it honestly instead of implying a full year.
 *
 * Usage:  node tools/generate-github.js [username]
 *         npm run github
 */

const fs = require('fs');
const path = require('path');

const USERNAME = process.argv[2] || 'inakm';
const OUTPUT = path.join('assets', 'data', 'github.json');
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const MAX_ACTIVITY = 12;

const REST = 'https://api.github.com';
const GRAPHQL = 'https://api.github.com/graphql';

const headers = () => {
    const h = { 'user-agent': 'inakm-portfolio-build', accept: 'application/vnd.github+json' };
    if (TOKEN) h.authorization = `Bearer ${TOKEN}`;
    return h;
};

async function rest(pathname) {
    const res = await fetch(REST + pathname, { headers: headers() });
    if (!res.ok) throw new Error(`GET ${pathname} -> ${res.status} ${res.statusText}`);
    return res.json();
}

const iso = (d) => new Date(d).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ *
 * Activity normalisation
 * ------------------------------------------------------------------ */

function describe(ev) {
    const p = ev.payload || {};
    const repo = ev.repo ? ev.repo.name : '';
    const base = { repo, repoUrl: ev.repo ? `https://github.com/${ev.repo.name}` : '', date: ev.created_at, type: ev.type };

    switch (ev.type) {
        case 'PushEvent': {
            const commits = Array.isArray(p.commits) ? p.commits : [];
            const count = p.size || p.distinct_size || commits.length || 1;
            return {
                ...base,
                text: `Pushed ${count} commit${count === 1 ? '' : 's'} to`,
                detail: commits[0] && commits[0].message ? commits[0].message.split('\n')[0].slice(0, 100) : ''
            };
        }
        case 'PullRequestEvent':
            return { ...base, text: `${p.action === 'closed' && p.pull_request && p.pull_request.merged ? 'Merged' : (p.action || 'Updated')} pull request #${p.number || ''} in`, detail: p.pull_request ? (p.pull_request.title || '').slice(0, 100) : '' };
        case 'IssuesEvent':
            return { ...base, text: `${p.action || 'Updated'} issue #${p.issue ? p.issue.number : ''} in`, detail: p.issue ? (p.issue.title || '').slice(0, 100) : '' };
        case 'IssueCommentEvent':
            return { ...base, text: `Commented on issue #${p.issue ? p.issue.number : ''} in`, detail: '' };
        case 'CreateEvent':
            return { ...base, text: `Created ${p.ref_type || 'reference'}${p.ref ? ' ' + p.ref : ''} in`, detail: '' };
        case 'DeleteEvent':
            return { ...base, text: `Deleted ${p.ref_type || 'reference'} ${p.ref || ''} in`, detail: '' };
        case 'WatchEvent':
            return { ...base, text: 'Starred', detail: '' };
        case 'ForkEvent':
            return { ...base, text: 'Forked', detail: '' };
        case 'ReleaseEvent':
            return { ...base, text: 'Published a release in', detail: p.release ? (p.release.name || p.release.tag_name || '') : '' };
        case 'PublicEvent':
            return { ...base, text: 'Made public', detail: '' };
        case 'MemberEvent':
            return { ...base, text: 'Added a collaborator to', detail: '' };
        default:
            return { ...base, text: (ev.type || 'Activity').replace(/Event$/, '').replace(/([a-z])([A-Z])/g, '$1 $2') + ' in', detail: '' };
    }
}

/* ------------------------------------------------------------------ *
 * Contribution heatmap
 * ------------------------------------------------------------------ *
 * days = [{ date, count, level? }]
 * GitHub renders weeks Sunday-first, so the range is padded out to whole
 * weeks. `level` is kept when the source provides GitHub's own bucketing.
 */

function weeksFromDays(days, { keepLevels = false } = {}) {
    if (!days.length) return { weeks: [], total: 0, max: 0 };

    const sorted = days.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const from = sorted[0].date;
    const to = sorted[sorted.length - 1].date;

    const start = new Date(from + 'T00:00:00Z');
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());
    const end = new Date(to + 'T00:00:00Z');
    end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

    const map = new Map(sorted.map((d) => [d.date, d]));
    const max = sorted.reduce((a, d) => Math.max(a, d.count), 0);
    const level = (c) => (c <= 0 ? 0 : c <= max * 0.25 ? 1 : c <= max * 0.5 ? 2 : c <= max * 0.75 ? 3 : 4);

    const weeks = [];
    let week = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        const day = map.get(key);
        const c = day ? day.count : 0;
        const l = keepLevels && day && typeof day.level === 'number' ? day.level : level(c);
        week.push({ d: key, c, l });
        if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length) weeks.push(week);

    return { weeks, max, total: sorted.reduce((a, d) => a + d.count, 0) };
}

// Public fallback: the ~90 days / max 300 events the API exposes. Not a year.
async function contributionsFromEvents(events) {
    const days = events.map((ev) => ({ date: iso(ev.created_at), count: 1 }));
    // Collapse to one entry per calendar day.
    const merged = {};
    for (const d of days) merged[d.date] = (merged[d.date] || 0) + d.count;
    const list = Object.entries(merged).map(([date, count]) => ({ date, count }));
    if (!list.length) return { available: false, source: 'events', label: 'Recent activity', weeks: [], total: 0, max: 0 };
    const { weeks, total, max } = weeksFromDays(list);
    return {
        available: true,
        source: 'events',
        label: 'Public activity',
        partial: true,
        from: list.map((d) => d.date).sort()[0],
        to: list.map((d) => d.date).sort().slice(-1)[0],
        total, max, weeks
    };
}

// Full public year straight from GitHub's own profile page. No token, no
// third-party service, and it is baked into the JSON at build time so the
// page never depends on this scrape succeeding at runtime.
async function contributionsFromScrape() {
    const res = await fetch(`https://github.com/users/${USERNAME}/contributions`, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; inakm-portfolio-build)' }
    });
    if (!res.ok) throw new Error(`contributions page -> ${res.status}`);
    const html = await res.text();

    const re = /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"[^>]*>[\s\S]*?<tool-tip[^>]*>([^<]*)<\/tool-tip>/g;
    const days = [];
    let m;
    while ((m = re.exec(html))) {
        const tip = m[3].trim();
        const count = /^no\s+contribution/i.test(tip) ? 0 : (parseInt(tip, 10) || 0);
        days.push({ date: m[1], level: +m[2], count });
    }
    if (days.length < 100) throw new Error(`only parsed ${days.length} day cells`);

    const { weeks, total, max } = weeksFromDays(days, { keepLevels: true });
    days.sort((a, b) => (a.date < b.date ? -1 : 1));
    return {
        available: true,
        source: 'scrape',
        label: 'Contributions in the last year',
        from: days[0].date,
        to: days[days.length - 1].date,
        total, max, weeks
    };
}

// Used by the GitHub Action when a token is present (it supplies GITHUB_TOKEN).
async function contributionsFromGraphQL() {
    const res = await fetch(GRAPHQL, {
        method: 'POST',
        headers: { ...headers(), 'content-type': 'application/json' },
        body: JSON.stringify({
            query: `query($login:String!){ user(login:$login){ contributionsCollection{
                        contributionCalendar{ totalContributions
                          weeks{ contributionDays{ date contributionCount } } } } } }`,
            variables: { login: USERNAME }
        })
    });
    if (!res.ok) throw new Error(`GraphQL -> ${res.status}`);
    const json = await res.json();
    const cal = json.data && json.data.user && json.data.user.contributionsCollection
        && json.data.user.contributionsCollection.contributionCalendar;
    if (!cal || !Array.isArray(cal.weeks)) throw new Error('GraphQL returned no calendar');

    const days = cal.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })));
    const { weeks, max } = weeksFromDays(days);
    return {
        available: true,
        source: 'graphql',
        label: 'Contributions in the last year',
        from: days[0].date,
        to: days[days.length - 1].date,
        total: cal.totalContributions,
        max, weeks
    };
}

/* ------------------------------------------------------------------ */

async function main() {
    console.log(`Collecting GitHub data for @${USERNAME}${TOKEN ? ' (authenticated)' : ' (unauthenticated)'}...`);

    const [user, repos, events] = await Promise.all([
        rest(`/users/${USERNAME}`),
        rest(`/users/${USERNAME}/repos?per_page=100&sort=pushed`),
        rest(`/users/${USERNAME}/events/public?per_page=100`)
    ]);

    const owned = repos.filter((r) => !r.fork);
    const languages = [...new Set(owned.map((r) => r.language).filter(Boolean))].sort();

    const topRepos = owned
        .slice()
        .sort((a, b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at)))
        .slice(0, 6)
        .map((r) => ({
            name: r.name,
            description: r.description || '',
            url: r.html_url,
            language: r.language || '',
            stars: r.stargazers_count,
            forks: r.forks_count,
            pushedAt: r.pushed_at,
            homepage: r.homepage || ''
        }));

    const activity = events.slice(0, MAX_ACTIVITY).map(describe);

    // Heatmap source priority: GitHub's public contributions page (full year,
    // no token) -> GraphQL (Action token) -> public events (partial fallback).
    let contributions;
    try {
        contributions = await contributionsFromScrape();
        console.log('  contribution calendar: full year (github.com contributions page)');
    } catch (err) {
        console.warn(`  contribution calendar: scrape failed (${err.message})`);
        if (TOKEN) {
            try {
                contributions = await contributionsFromGraphQL();
                console.log('  contribution calendar: full year (GraphQL)');
            } catch (err2) {
                console.warn(`  contribution calendar: GraphQL failed (${err2.message})`);
            }
        }
        if (!contributions) {
            contributions = await contributionsFromEvents(events);
            console.warn('  contribution calendar: public events fallback (partial)');
        }
    }

    const payload = {
        generated: new Date().toISOString(),
        username: USERNAME,
        user: {
            login: user.login,
            name: user.name || user.login,
            url: user.html_url,
            avatar: user.avatar_url,
            bio: user.bio || '',
            company: user.company || '',
            location: user.location || '',
            createdAt: user.created_at
        },
        stats: {
            publicRepos: user.public_repos,
            totalStars: owned.reduce((s, r) => s + r.stargazers_count, 0),
            totalForks: owned.reduce((s, r) => s + r.forks_count, 0),
            followers: user.followers,
            following: user.following,
            languages
        },
        repos: topRepos,
        activity,
        contributions
    };

    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${activity.length} activity item(s) + ${topRepos.length} repo(s) to ${OUTPUT}`);
    console.log(`Heatmap: ${contributions.source}, ${contributions.total} contribution(s), ${contributions.weeks.length} week(s)`);
}

main().catch((err) => {
    console.error('generate-github failed:', err.message);
    process.exitCode = 1;
});