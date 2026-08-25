// ─── 구절 검색 모듈 ──────────────────────────────────────────────────────
// [확정 스펙]
//   - 검색 대상: 본문(content) + 성구(ref), 입력값이 성구 주소처럼 보이면
//     ref 우선 매칭, 아니면 본문(content) 포함 검색
//   - 검색 범위: config.json에 등록된 전체 코스
//   - 같은 구절(동일 ref+content)이 여러 코스에 있으면 하나로 묶어서
//     "N개 코스" 뱃지 → 탭하면 서브목록 펼침
//   - 결과 탭 시 화면 이동 없이 그 자리에 카드 펼침 (더 검색 이어가기 용이)
//   - 결과가 많으면 일부만 보여주고 "더보기"로 점진 로드

const SEARCH_PAGE_SIZE = 5;

let searchCourseList = [];     // config.json 전체 코스 목록
let searchAllVerses  = [];     // { ...verse, courseFile, courseName } 전체 인덱스 (지연 구축)
let searchIndexReady = false;
let searchGroupedResults = []; // 현재 검색어의 그룹화된 결과
let searchVisibleCount = SEARCH_PAGE_SIZE;
let searchDebounceTimer = null;

// ─── 화면 열기 / 닫기 ────────────────────────────────────────────────────
window.openSearchScreen = async () => {
    window.toggleMenu();
    document.getElementById('search-screen').style.display = 'block';
    document.getElementById('app-main-view').style.display = 'none';
    const mainTopBar = document.getElementById('main-top-bar');
    if (mainTopBar) mainTopBar.style.display = 'none';

    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML =
        '<div class="search-empty-hint">단어나 성구 주소를 입력해 전체 코스에서 검색해보세요.<br>예: "은혜", "요 3:16"</div>';
    document.getElementById('search-result-count').style.display = 'none';

    if (!searchIndexReady) {
        await buildSearchIndex();
    }

    // 화면을 열 때마다 입력창에 포커스 (모바일에서는 자동으로 키보드까지 뜨진 않을 수 있음)
    setTimeout(() => document.getElementById('search-input')?.focus(), 100);
};

window.closeSearchScreen = () => {
    document.getElementById('search-screen').style.display = 'none';
    document.getElementById('app-main-view').style.display = 'flex';
    const mainTopBar = document.getElementById('main-top-bar');
    if (mainTopBar) mainTopBar.style.display = 'flex';
};

// ─── 전체 코스를 미리 불러와 검색 인덱스 구축 (최초 1회) ────────────────
async function buildSearchIndex() {
    const resultsEl = document.getElementById('search-results');
    resultsEl.innerHTML = '<p style="text-align:center; color:rgba(255,255,255,0.7); padding:30px 0;">검색 준비 중...</p>';

    try {
        const res = await fetch('data/config.json');
        searchCourseList = await res.json();
    } catch (e) {
        console.error('config.json 로드 실패:', e);
        searchCourseList = [];
    }

    const results = await Promise.all(searchCourseList.map(async (course) => {
        try {
            const r = await fetch(`data/${course.file}`);
            const verses = await r.json();
            return verses.map(v => ({ ...v, courseFile: course.file, courseName: course.name }));
        } catch (e) {
            console.warn(`${course.file} 로드 실패:`, e);
            return [];
        }
    }));

    searchAllVerses = results.flat();
    searchIndexReady = true;

    document.getElementById('search-results').innerHTML =
        '<div class="search-empty-hint">단어나 성구 주소를 입력해 전체 코스에서 검색해보세요.<br>예: "은혜", "요 3:16"</div>';
}

// ─── 입력 시마다 디바운스 후 검색 실행 ───────────────────────────────────
window.onSearchInput = () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(runSearch, 250);
};

// ─── 검색어가 성구 주소 형태인지 판별 ────────────────────────────────────
// "요 3:16", "고전 13:4-7", "1 John 5:11,12" 처럼 책이름+장:절 패턴을 성구로 간주
function looksLikeRefQuery(q) {
    return /\d/.test(q) && /[:장절]/.test(q) || /\d+:\d+/.test(q);
}

// ─── 검색 실행 ───────────────────────────────────────────────────────────
function runSearch() {
    const query = document.getElementById('search-input').value.trim();
    const resultsEl = document.getElementById('search-results');
    const countEl   = document.getElementById('search-result-count');

    if (!query) {
        resultsEl.innerHTML = '<div class="search-empty-hint">단어나 성구 주소를 입력해 전체 코스에서 검색해보세요.<br>예: "은혜", "요 3:16"</div>';
        countEl.style.display = 'none';
        return;
    }

    if (!searchIndexReady) return; // 인덱스 준비 전이면 대기

    const normalizedQuery = query.replace(/\s+/g, '').toLowerCase();
    const preferRef = looksLikeRefQuery(query);

    const matches = searchAllVerses.filter(v => {
        const refNorm     = (v.ref || '').replace(/\s+/g, '').toLowerCase();
        const contentNorm = (v.content || '').replace(/\s+/g, '').toLowerCase();
        if (preferRef) {
            return refNorm.includes(normalizedQuery) || contentNorm.includes(normalizedQuery);
        }
        return contentNorm.includes(normalizedQuery) || refNorm.includes(normalizedQuery);
    });

    // ─── 같은 성구+본문을 하나로 그룹화 (여러 코스에 중복 존재 시) ──────
    const groupMap = new Map();
    matches.forEach(v => {
        const key = `${v.ref}||${v.content}`;
        if (!groupMap.has(key)) {
            groupMap.set(key, { ref: v.ref, content: v.content, theme: v.theme, items: [] });
        }
        groupMap.get(key).items.push(v);
    });

    searchGroupedResults = [...groupMap.values()];
    searchVisibleCount = SEARCH_PAGE_SIZE;

    renderSearchResults(query);
}

// ─── 검색어 하이라이트 ───────────────────────────────────────────────────
function highlightMatch(text, query) {
    if (!text || !query) return text || '';
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escapeHtml(text.length > 60 ? text.slice(0, 60) + '…' : text);

    const start   = Math.max(0, idx - 20);
    const end     = Math.min(text.length, idx + query.length + 30);
    const before  = (start > 0 ? '…' : '') + text.slice(start, idx);
    const matched = text.slice(idx, idx + query.length);
    const after   = text.slice(idx + query.length, end) + (end < text.length ? '…' : '');

    return `${escapeHtml(before)}<mark>${escapeHtml(matched)}</mark>${escapeHtml(after)}`;
}

function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

// ─── 결과 렌더링 ─────────────────────────────────────────────────────────
function renderSearchResults(query) {
    const resultsEl = document.getElementById('search-results');
    const countEl   = document.getElementById('search-result-count');

    const total = searchGroupedResults.length;
    countEl.style.display = 'block';
    countEl.innerText = `검색결과 ${total}건`;

    if (total === 0) {
        resultsEl.innerHTML = '<div class="search-empty-hint">일치하는 구절을 찾지 못했어요.<br>다른 단어로 다시 검색해보세요.</div>';
        return;
    }

    const visible = searchGroupedResults.slice(0, searchVisibleCount);

    resultsEl.innerHTML = visible.map((group, gi) => {
        const isMulti = group.items.length > 1;
        const badgeHtml = isMulti
            ? `<span class="search-course-badge multi" onclick="event.stopPropagation(); toggleSearchSublist(${gi})">${group.items.length}개 코스 ▾</span>`
            : `<span class="search-course-badge">${escapeHtml(group.items[0].courseName)}</span>`;

        const snippetSource = group.content.includes(query) || !group.ref.toLowerCase().includes(query.toLowerCase())
            ? group.content
            : group.content;

        return `
            <div class="search-result-item" onclick="expandSearchResult(${gi}, 0)">
                <div class="search-result-top">
                    <span class="search-result-ref">${escapeHtml(group.ref)}</span>
                    ${badgeHtml}
                </div>
                <div class="search-result-theme">${escapeHtml(group.theme || '')}</div>
                <div class="search-result-snippet">${highlightMatch(snippetSource, query)}</div>
                <div id="search-sublist-${gi}" style="display:none;"></div>
                <div id="search-expanded-${gi}"></div>
            </div>
        `;
    }).join('');

    if (searchVisibleCount < total) {
        const remaining = total - searchVisibleCount;
        resultsEl.innerHTML += `<button class="search-load-more-btn" onclick="loadMoreSearchResults()">더보기 (${remaining}건 더 있음)</button>`;
    }
}

// ─── 더보기 ──────────────────────────────────────────────────────────────
window.loadMoreSearchResults = () => {
    searchVisibleCount += SEARCH_PAGE_SIZE;
    const query = document.getElementById('search-input').value.trim();
    renderSearchResults(query);
};

// ─── 코스 중복 시 서브목록 펼침/닫힘 ─────────────────────────────────────
window.toggleSearchSublist = (gi) => {
    const sublistEl = document.getElementById(`search-sublist-${gi}`);
    if (!sublistEl) return;

    const group = searchGroupedResults[gi];
    const isShown = sublistEl.style.display !== 'none';

    if (isShown) {
        sublistEl.style.display = 'none';
        return;
    }

    sublistEl.innerHTML = `
        <div class="search-course-sublist">
            ${group.items.map((item, ii) => `
                <div class="search-course-sub-item" data-gi="${gi}" data-ii="${ii}" onclick="event.stopPropagation(); expandSearchResult(${gi}, ${ii})">
                    <span>${escapeHtml(item.courseName)}</span>
                    <span>›</span>
                </div>
            `).join('')}
        </div>
    `;
    sublistEl.style.display = 'block';
};

// ─── 결과 탭 시 그 자리에 카드 펼침 (화면 이동 없음) ─────────────────────
window.expandSearchResult = (gi, ii) => {
    const group = searchGroupedResults[gi];
    const item  = group.items[ii];
    const expandedEl = document.getElementById(`search-expanded-${gi}`);
    if (!expandedEl || !item) return;

    expandedEl.innerHTML = `
        <div class="search-expanded-card">
            <button class="search-expanded-close" onclick="event.stopPropagation(); closeExpandedSearchResult(${gi})">✕</button>
            <div class="search-expanded-course-tag">${escapeHtml(item.courseName)}${item.p ? ' · ' + escapeHtml(item.p) : ''}</div>
            <div class="search-expanded-ref">${escapeHtml(item.ref)}</div>
            <div class="search-expanded-theme">${escapeHtml(item.theme || '')}</div>
            <div class="search-expanded-content">${escapeHtml(item.content)}</div>
        </div>
    `;

    // 서브목록 안에서 선택한 경우, 현재 선택된 코스 표시
    const sublistEl = document.getElementById(`search-sublist-${gi}`);
    if (sublistEl) {
        sublistEl.querySelectorAll('.search-course-sub-item').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.ii) === ii);
        });
    }
};

window.closeExpandedSearchResult = (gi) => {
    const expandedEl = document.getElementById(`search-expanded-${gi}`);
    if (expandedEl) expandedEl.innerHTML = '';
};
