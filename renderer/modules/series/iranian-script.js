// modules/series/iranian-script.js
(function() {
    // ---------- IndexedDB (استفاده از نسخه 6 برای هماهنگی با بقیه صفحات) ----------
    const DB_NAME = 'MediaCenterDB';
    const STORE_NAME = 'iranian_series';
    let db = null;

    function openDB() {
        return new Promise((resolve, reject) => {
            if (db && db.name === DB_NAME) {
                resolve(db);
                return;
            }
            const request = indexedDB.open(DB_NAME, 6);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                db = request.result;
                resolve(db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('iranian_series')) {
                    db.createObjectStore('iranian_series', { keyPath: 'id' });
                }
            };
        });
    }

    async function loadSeriesFromDB() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    async function saveSeriesToDB(series) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(series);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async function deleteSeriesFromDB(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    // ---------- لیست کشورها (از ماژول فیلم‌ها) ----------
    const COUNTRIES_LIST = [
        "ایران", "آمریکا", "انگلستان", "فرانسه", "آلمان", "ایتالیا", "اسپانیا", "کانادا", "استرالیا",
        "ژاپن", "کره جنوبی", "هند", "ترکیه", "روسیه", "چین", "برزیل", "مکزیک", "سوئد", "نروژ",
        "دانمارک", "هلند", "بلژیک", "سوئیس", "اتریش", "لهستان", "جمهوری چک", "مجارستان", "رومانی",
        "یونان", "مصر", "اسرائیل", "امارات متحده عربی", "تایلند", "ویتنام", "فیلیپین", "اندونزی",
        "آرژانتین", "شیلی", "کلمبیا", "آفریقای جنوبی", "نیوزیلند", "پرتغال", "فنلاند", "ایرلند", "کرواسی"
    ];

    function populateCountryDropdowns() {
        const filterSelect = document.getElementById('series-filter-country');
        const movieSelect = document.getElementById('series-country');
        if (filterSelect) {
            const old = filterSelect.value;
            filterSelect.innerHTML = '<option value="">همه</option>';
            COUNTRIES_LIST.forEach(c => filterSelect.appendChild(new Option(c, c)));
            if (old && COUNTRIES_LIST.includes(old)) filterSelect.value = old;
        }
        if (movieSelect) {
            const old = movieSelect.value;
            movieSelect.innerHTML = '<option value="">انتخاب کنید</option>';
            COUNTRIES_LIST.forEach(c => movieSelect.appendChild(new Option(c, c)));
            if (old && COUNTRIES_LIST.includes(old)) movieSelect.value = old;
        }
    }

    // ---------- متغیرهای اصلی ----------
    let allSeries = [];
    let filteredSeries = [];
    let currentPage = 1;
    const itemsPerPage = 20;
    let currentSort = { field: 'title', order: 'asc' };
    let currentEditId = null;
    let tempPoster = null;

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
    }

    // ---------- صفحه‌بندی ----------
    function updatePagination() {
        const totalPages = Math.ceil(filteredSeries.length / itemsPerPage) || 1;
        const container = document.getElementById('pagination-container');
        if (!container) return;
        let html = `<button class="page-btn" onclick="window.changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>قبلی</button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.changePage(${i})">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += `<span class="page-dots">...</span>`;
            }
        }
        html += `<button class="page-btn" onclick="window.changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>بعدی</button>`;
        container.innerHTML = html;
    }

    function changePage(page) {
        if (page < 1) return;
        const totalPages = Math.ceil(filteredSeries.length / itemsPerPage);
        if (page > totalPages) return;
        currentPage = page;
        renderSeriesTable();
        updatePagination();
    }

    // ---------- فیلتر و مرتب‌سازی ----------
    async function refreshSeriesData() {
        allSeries = await loadSeriesFromDB();
        applyFiltersAndSort();
    }

    function applyFiltersAndSort() {
        let filtered = [...allSeries];
        const search = (document.getElementById('series-search')?.value || '').toLowerCase();
        const countryFilter = document.getElementById('series-filter-country')?.value || '';
        const languageFilter = document.getElementById('series-filter-language')?.value || '';
        const genreFilter = document.getElementById('series-filter-genre')?.value || '';

        if (search) filtered = filtered.filter(s => (s.title || '').toLowerCase().includes(search) || (s.titleEn || '').toLowerCase().includes(search));
        if (countryFilter) filtered = filtered.filter(s => (s.country || '') === countryFilter);
        if (languageFilter) {
            if (languageFilter === 'هر دو') filtered = filtered.filter(s => s.language === 'زبان اصلی' || s.language === 'دوبله فارسی');
            else filtered = filtered.filter(s => (s.language || '') === languageFilter);
        }
        if (genreFilter) filtered = filtered.filter(s => (s.genres || []).includes(genreFilter));

        filtered.sort((a, b) => {
            let valA = a[currentSort.field] || '';
            let valB = b[currentSort.field] || '';
            if (currentSort.field === 'imdb') {
                valA = +valA || 0;
                valB = +valB || 0;
                return currentSort.order === 'asc' ? valA - valB : valB - valA;
            }
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
            return currentSort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });

        filteredSeries = filtered;
        currentPage = 1;
        renderSeriesTable();
        updatePagination();
    }

    function getLastEpisodeInfo(series) {
        if (!series.seasons || series.seasons.length === 0) return 'هیچ قسمتی';
        const lastSeason = series.seasons[series.seasons.length - 1];
        if (!lastSeason.episodes || lastSeason.episodes.length === 0) return `${lastSeason.seasonName} - بدون قسمت`;
        const lastEpisode = lastSeason.episodes[lastSeason.episodes.length - 1];
        return `${lastSeason.seasonName} - قسمت ${lastEpisode.episodeNumber}`;
    }

    function renderSeriesTable() {
        const start = (currentPage - 1) * itemsPerPage;
        const pageSeries = filteredSeries.slice(start, start + itemsPerPage);
        const tbody = document.querySelector('#series-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (pageSeries.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">هیچ سریالی یافت نشد</td></tr>';
            return;
        }

        pageSeries.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${s.poster || ''}" class="thumbnail" onclick="window.enlargeImage('${s.poster}')" onerror="this.style.display='none'"></td>
                <td>${escapeHtml(s.title)}</td>
                <td>${escapeHtml(s.titleEn || '---')}</td>
                <td>${escapeHtml(s.year || '---')}</td>
                <td>${escapeHtml(s.director || '---')}</td>
                <td>${escapeHtml(s.country || '---')}</td>
                <td>${escapeHtml(s.language || '---')}</td>
                <td>${getLastEpisodeInfo(s)}</td>
                <td class="actions-cell">
                    <button class="action-btn episodes-btn" title="مدیریت قسمت‌ها" onclick="window.openEpisodesManager('${s.id}')"><i class="fas fa-list"></i></button>
                    <button class="action-btn edit-btn" title="ویرایش سریال" onclick="window.showSeriesForm('${s.id}')"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" title="حذف سریال" onclick="window.deleteSeries('${s.id}')"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // ---------- فرم افزودن/ویرایش سریال ----------
    function showSeriesForm(editId = null) {
        currentEditId = editId;
        document.getElementById('form-title').innerHTML = editId ? 'ویرایش سریال' : 'افزودن سریال جدید';
        document.getElementById('series-modal').style.display = 'flex';
        tempPoster = null;
        if (editId) {
            const s = allSeries.find(x => x.id === editId);
            if (s) {
                document.getElementById('series-title').value = s.title || '';
                document.getElementById('series-title-en').value = s.titleEn || '';
                document.getElementById('series-year').value = s.year || '';
                document.getElementById('series-director').value = s.director || '';
                document.getElementById('series-writer').value = s.writer || '';
                document.getElementById('series-cast').value = s.cast || '';
                document.getElementById('series-duration').value = s.duration || '';
                document.getElementById('series-country').value = s.country || '';
                document.getElementById('series-language').value = s.language || '';
                document.getElementById('series-imdb').value = s.imdb || '';
                document.getElementById('series-quality').value = s.quality || '';
                document.getElementById('series-subtitle').value = s.subtitle || '';
                document.getElementById('series-desc').value = s.desc || '';
                const genres = document.getElementById('series-genres');
                for (const opt of genres.options) opt.selected = (s.genres || []).includes(opt.value);
                if (s.poster) {
                    tempPoster = s.poster;
                    document.getElementById('poster-preview').src = s.poster;
                    document.getElementById('poster-preview').style.display = 'block';
                }
            }
        } else {
            const fields = ['series-title','series-title-en','series-year','series-director','series-writer','series-cast','series-duration','series-country','series-language','series-imdb','series-quality','series-subtitle','series-desc'];
            fields.forEach(id => document.getElementById(id).value = '');
            document.getElementById('series-genres').selectedIndex = -1;
            document.getElementById('poster-preview').style.display = 'none';
        }
    }

    function closeSeriesModal() {
        document.getElementById('series-modal').style.display = 'none';
        currentEditId = null;
    }

    async function saveSeries() {
        const title = document.getElementById('series-title').value.trim();
        if (!title) return Swal.fire('خطا', 'نام فارسی سریال الزامی است', 'error');
        const genres = Array.from(document.getElementById('series-genres').selectedOptions).map(o => o.value);
        const series = {
            id: currentEditId || Date.now().toString(),
            title,
            titleEn: document.getElementById('series-title-en').value.trim(),
            year: document.getElementById('series-year').value.trim(),
            director: document.getElementById('series-director').value.trim(),
            writer: document.getElementById('series-writer').value.trim(),
            cast: document.getElementById('series-cast').value.trim(),
            duration: parseInt(document.getElementById('series-duration').value) || 0,
            country: document.getElementById('series-country').value,
            language: document.getElementById('series-language').value,
            imdb: parseFloat(document.getElementById('series-imdb').value) || null,
            quality: document.getElementById('series-quality').value.trim(),
            subtitle: document.getElementById('series-subtitle').value.trim(),
            genres,
            poster: tempPoster || '',
            desc: document.getElementById('series-desc').value.trim(),
            seasons: currentEditId ? (allSeries.find(s => s.id === currentEditId)?.seasons || []) : []
        };
        await saveSeriesToDB(series);
        closeSeriesModal();
        await refreshSeriesData();
        Swal.fire('موفق', 'سریال ذخیره شد', 'success');
    }

    async function deleteSeries(id) {
        const result = await Swal.fire({ title: 'حذف سریال', text: 'آیا از حذف این سریال اطمینان دارید؟', icon: 'warning', showCancelButton: true });
        if (!result.isConfirmed) return;
        await deleteSeriesFromDB(id);
        await refreshSeriesData();
        Swal.fire('حذف شد', '', 'success');
    }

    // ---------- مدیریت فصل‌ها و قسمت‌ها ----------
    let currentSeriesForEpisodes = null;

    async function openEpisodesManager(seriesId) {
        currentSeriesForEpisodes = allSeries.find(s => s.id === seriesId);
        if (!currentSeriesForEpisodes) return;
        renderEpisodesManager();
        document.getElementById('episodes-modal').style.display = 'flex';
    }

    function renderEpisodesManager() {
        const container = document.getElementById('episodes-container');
        if (!container) return;
        container.innerHTML = '';
        if (!currentSeriesForEpisodes.seasons || currentSeriesForEpisodes.seasons.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">هیچ فصلی اضافه نشده است. دکمه "افزودن فصل جدید" را بزنید.</div>';
            return;
        }
        currentSeriesForEpisodes.seasons.forEach((season, idx) => {
            const seasonDiv = document.createElement('div');
            seasonDiv.className = 'season-card';
            seasonDiv.innerHTML = `
                <div class="season-header">
                    <input type="text" class="season-name-input" value="${escapeHtml(season.seasonName)}" placeholder="نام فصل (مثال: فصل اول یا فصل رضایت)" data-season-index="${idx}">
                    <div>
                        <button class="btn btn-sm btn-primary add-episode-btn" data-season-index="${idx}"><i class="fas fa-plus"></i> افزودن قسمت</button>
                        <button class="btn btn-sm btn-danger delete-season-btn" data-season-index="${idx}"><i class="fas fa-trash"></i> حذف فصل</button>
                    </div>
                </div>
                <div class="episodes-list" id="episodes-list-${idx}"></div>
            `;
            container.appendChild(seasonDiv);
            const episodesContainer = seasonDiv.querySelector(`.episodes-list`);
            if (season.episodes && season.episodes.length) {
                season.episodes.forEach((ep, epIdx) => {
                    const epDiv = document.createElement('div');
                    epDiv.className = 'episode-item';
                    epDiv.innerHTML = `
                        <div class="episode-info">
                            <span><strong>قسمت ${ep.episodeNumber}</strong>${ep.title ? ` - ${escapeHtml(ep.title)}` : ''}</span>
                            ${ep.filePath ? `<span class="file-path" style="font-size:12px; color:#94a3b8;">📁 ${escapeHtml(ep.filePath)}</span>` : ''}
                        </div>
                        <div class="episode-actions">
                            <button class="btn btn-sm edit-episode-btn" data-season="${idx}" data-episode="${epIdx}"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm delete-episode-btn" data-season="${idx}" data-episode="${epIdx}"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    `;
                    episodesContainer.appendChild(epDiv);
                });
            } else {
                episodesContainer.innerHTML = '<div style="color:#94a3b8; padding:8px;">هیچ قسمتی اضافه نشده است.</div>';
            }
        });

        // اتصال رویدادها
        container.querySelectorAll('.season-name-input').forEach(inp => {
            inp.addEventListener('change', async (e) => {
                const seasonIdx = parseInt(inp.dataset.seasonIndex);
                if (!isNaN(seasonIdx)) {
                    currentSeriesForEpisodes.seasons[seasonIdx].seasonName = inp.value.trim() || `فصل ${seasonIdx+1}`;
                    await saveSeriesToDB(currentSeriesForEpisodes);
                    await refreshSeriesData();
                    renderEpisodesManager();
                }
            });
        });
        container.querySelectorAll('.add-episode-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const seasonIdx = parseInt(btn.dataset.seasonIndex);
                if (!isNaN(seasonIdx)) await addEpisodeToSeason(seasonIdx);
            });
        });
        container.querySelectorAll('.delete-season-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const seasonIdx = parseInt(btn.dataset.seasonIndex);
                if (!isNaN(seasonIdx) && await Swal.fire({ title: 'حذف فصل', text: 'آیا از حذف این فصل و تمام قسمت‌های آن اطمینان دارید؟', icon: 'warning', showCancelButton: true }).then(r => r.isConfirmed)) {
                    currentSeriesForEpisodes.seasons.splice(seasonIdx, 1);
                    await saveSeriesToDB(currentSeriesForEpisodes);
                    await refreshSeriesData();
                    renderEpisodesManager();
                }
            });
        });
        container.querySelectorAll('.edit-episode-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const seasonIdx = parseInt(btn.dataset.season);
                const epIdx = parseInt(btn.dataset.episode);
                await editEpisode(seasonIdx, epIdx);
            });
        });
        container.querySelectorAll('.delete-episode-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const seasonIdx = parseInt(btn.dataset.season);
                const epIdx = parseInt(btn.dataset.episode);
                if (await Swal.fire({ title: 'حذف قسمت', text: 'آیا از حذف این قسمت اطمینان دارید؟', icon: 'warning', showCancelButton: true }).then(r => r.isConfirmed)) {
                    currentSeriesForEpisodes.seasons[seasonIdx].episodes.splice(epIdx, 1);
                    await saveSeriesToDB(currentSeriesForEpisodes);
                    await refreshSeriesData();
                    renderEpisodesManager();
                }
            });
        });
    }

    async function addEpisodeToSeason(seasonIdx) {
        // برای جلوگیری از مشکل z-index، مودال اصلی را موقتاً مخفی می‌کنیم
        const episodesModal = document.getElementById('episodes-modal');
        const wasVisible = episodesModal.style.display === 'flex';
        if (wasVisible) episodesModal.style.display = 'none';

        const { value: formValues } = await Swal.fire({
            title: 'افزودن قسمت جدید',
            html: `
                <input type="number" id="episode-number" class="swal2-input" placeholder="شماره قسمت (مثال: 1)" min="1" required>
                <input type="text" id="episode-title" class="swal2-input" placeholder="نام قسمت (اختیاری)">
                <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
                    <input type="text" id="episode-file" class="swal2-input" placeholder="مسیر فایل ویدیویی" readonly style="flex:1;">
                    <button type="button" id="select-episode-file" class="btn btn-sm">انتخاب فایل</button>
                </div>
                <textarea id="episode-desc" class="swal2-textarea" placeholder="توضیحات قسمت (اختیاری)"></textarea>
            `,
            focusConfirm: false,
            preConfirm: () => {
                const number = parseInt(document.getElementById('episode-number').value);
                if (isNaN(number) || number < 1) return Swal.showValidationMessage('شماره قسمت معتبر نیست');
                return {
                    episodeNumber: number,
                    title: document.getElementById('episode-title').value,
                    filePath: document.getElementById('episode-file').value,
                    description: document.getElementById('episode-desc').value
                };
            },
            showCancelButton: true,
            confirmButtonText: 'افزودن',
            cancelButtonText: 'انصراف',
            didOpen: () => {
                document.getElementById('select-episode-file').addEventListener('click', async () => {
                    if (window.electronAPI && window.electronAPI.selectFile) {
                        const file = await window.electronAPI.selectFile();
                        if (file) document.getElementById('episode-file').value = file;
                    } else {
                        Swal.fire('اطلاع', 'این قابلیت فقط در نسخه الکترون فعال است', 'info');
                    }
                });
            }
        });

        if (wasVisible) episodesModal.style.display = 'flex';

        if (formValues) {
            if (!currentSeriesForEpisodes.seasons[seasonIdx].episodes) currentSeriesForEpisodes.seasons[seasonIdx].episodes = [];
            currentSeriesForEpisodes.seasons[seasonIdx].episodes.push(formValues);
            currentSeriesForEpisodes.seasons[seasonIdx].episodes.sort((a,b) => a.episodeNumber - b.episodeNumber);
            await saveSeriesToDB(currentSeriesForEpisodes);
            await refreshSeriesData();
            renderEpisodesManager();
            Swal.fire('موفق', 'قسمت اضافه شد', 'success');
        }
    }

    async function editEpisode(seasonIdx, epIdx) {
        const ep = currentSeriesForEpisodes.seasons[seasonIdx].episodes[epIdx];
        const episodesModal = document.getElementById('episodes-modal');
        const wasVisible = episodesModal.style.display === 'flex';
        if (wasVisible) episodesModal.style.display = 'none';

        const { value: formValues } = await Swal.fire({
            title: 'ویرایش قسمت',
            html: `
                <input type="number" id="episode-number" class="swal2-input" placeholder="شماره قسمت" value="${ep.episodeNumber}" min="1" required>
                <input type="text" id="episode-title" class="swal2-input" placeholder="نام قسمت" value="${escapeHtml(ep.title || '')}">
                <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
                    <input type="text" id="episode-file" class="swal2-input" placeholder="مسیر فایل ویدیویی" value="${escapeHtml(ep.filePath || '')}" readonly style="flex:1;">
                    <button type="button" id="select-episode-file" class="btn btn-sm">انتخاب فایل</button>
                </div>
                <textarea id="episode-desc" class="swal2-textarea" placeholder="توضیحات قسمت">${escapeHtml(ep.description || '')}</textarea>
            `,
            focusConfirm: false,
            preConfirm: () => {
                const number = parseInt(document.getElementById('episode-number').value);
                if (isNaN(number) || number < 1) return Swal.showValidationMessage('شماره قسمت معتبر نیست');
                return {
                    episodeNumber: number,
                    title: document.getElementById('episode-title').value,
                    filePath: document.getElementById('episode-file').value,
                    description: document.getElementById('episode-desc').value
                };
            },
            showCancelButton: true,
            confirmButtonText: 'ذخیره',
            cancelButtonText: 'انصراف',
            didOpen: () => {
                document.getElementById('select-episode-file').addEventListener('click', async () => {
                    if (window.electronAPI && window.electronAPI.selectFile) {
                        const file = await window.electronAPI.selectFile();
                        if (file) document.getElementById('episode-file').value = file;
                    } else {
                        Swal.fire('اطلاع', 'این قابلیت فقط در نسخه الکترون فعال است', 'info');
                    }
                });
            }
        });

        if (wasVisible) episodesModal.style.display = 'flex';

        if (formValues) {
            currentSeriesForEpisodes.seasons[seasonIdx].episodes[epIdx] = formValues;
            currentSeriesForEpisodes.seasons[seasonIdx].episodes.sort((a,b) => a.episodeNumber - b.episodeNumber);
            await saveSeriesToDB(currentSeriesForEpisodes);
            await refreshSeriesData();
            renderEpisodesManager();
            Swal.fire('موفق', 'قسمت ویرایش شد', 'success');
        }
    }

    function closeEpisodesModal() {
        document.getElementById('episodes-modal').style.display = 'none';
        currentSeriesForEpisodes = null;
    }

    async function addNewSeason() {
        const episodesModal = document.getElementById('episodes-modal');
        const wasVisible = episodesModal.style.display === 'flex';
        if (wasVisible) episodesModal.style.display = 'none';

        const { value: seasonName } = await Swal.fire({
            title: 'افزودن فصل جدید',
            input: 'text',
            inputPlaceholder: 'نام فصل (مثال: فصل اول یا فصل رضایت)',
            showCancelButton: true,
            confirmButtonText: 'افزودن',
            cancelButtonText: 'انصراف',
            inputValidator: (value) => {
                if (!value) return 'لطفاً نام فصل را وارد کنید';
            }
        });

        if (wasVisible) episodesModal.style.display = 'flex';

        if (seasonName) {
            if (!currentSeriesForEpisodes.seasons) currentSeriesForEpisodes.seasons = [];
            currentSeriesForEpisodes.seasons.push({
                seasonName: seasonName,
                episodes: []
            });
            await saveSeriesToDB(currentSeriesForEpisodes);
            await refreshSeriesData();
            renderEpisodesManager();
            Swal.fire('موفق', 'فصل جدید اضافه شد', 'success');
        }
    }

    // ---------- رویدادهای عمومی ----------
    function previewPoster(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            tempPoster = e.target.result;
            document.getElementById('poster-preview').src = tempPoster;
            document.getElementById('poster-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    function resetFilters() {
        document.getElementById('series-filter-country').value = '';
        document.getElementById('series-filter-language').value = '';
        document.getElementById('series-filter-genre').value = '';
        document.getElementById('series-search').value = '';
        applyFiltersAndSort();
    }

    function setupSorting() {
        const headers = document.querySelectorAll('#series-table th[data-sort]');
        headers.forEach(th => {
            th.removeEventListener('click', th._listener);
            const listener = () => {
                const field = th.dataset.sort;
                if (currentSort.field === field) currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
                else { currentSort.field = field; currentSort.order = 'asc'; }
                applyFiltersAndSort();
                headers.forEach(h => { const icon = h.querySelector('i'); if (icon) icon.className = 'fas fa-sort'; });
                const icon = th.querySelector('i');
                if (icon) icon.className = currentSort.order === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            };
            th.addEventListener('click', listener);
            th._listener = listener;
        });
    }

    function populateGenreFilter() {
        const genres = ["درام","کمدی","ترسناک","اکشن","علمی-تخیلی","عاشقانه","جنایی","مستند","تاریخی","انیمیشن","خانوادگی","ماجراجویی","فانتزی","معمایی"];
        const select = document.getElementById('series-filter-genre');
        if (select) {
            select.innerHTML = '<option value="">همه</option>';
            genres.forEach(g => select.appendChild(new Option(g,g)));
        }
    }

    function enlargeImage(src) {
        if (src) Swal.fire({ imageUrl: src, showCloseButton: true, showConfirmButton: false });
    }

    function attachEvents() {
        document.getElementById('add-series-btn')?.addEventListener('click', () => showSeriesForm());
        document.getElementById('reset-filters-btn')?.addEventListener('click', () => resetFilters());
        document.getElementById('save-series-btn')?.addEventListener('click', () => saveSeries());
        document.getElementById('close-modal-btn')?.addEventListener('click', () => closeSeriesModal());
        document.getElementById('series-poster')?.addEventListener('change', e => previewPoster(e));
        document.getElementById('series-search')?.addEventListener('input', () => applyFiltersAndSort());
        document.getElementById('series-filter-country')?.addEventListener('change', () => applyFiltersAndSort());
        document.getElementById('series-filter-language')?.addEventListener('change', () => applyFiltersAndSort());
        document.getElementById('series-filter-genre')?.addEventListener('change', () => applyFiltersAndSort());
        document.getElementById('add-season-btn')?.addEventListener('click', () => addNewSeason());
        document.getElementById('close-episodes-modal-btn')?.addEventListener('click', () => closeEpisodesModal());
    }

    // ---------- مقداردهی اولیه ----------
    async function init_series_iranian() {
        console.log('شروع راه‌اندازی سریال‌های ایرانی...');
        populateCountryDropdowns();
        populateGenreFilter();
        await refreshSeriesData();
        setupSorting();
        attachEvents();
        console.log('راه‌اندازی سریال‌های ایرانی کامل شد');
    }

    // اتصال به window
    window.showSeriesForm = showSeriesForm;
    window.deleteSeries = deleteSeries;
    window.openEpisodesManager = openEpisodesManager;
    window.enlargeImage = enlargeImage;
    window.changePage = changePage;
    window.init_series_iranian = init_series_iranian;

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init_series_iranian);
    else init_series_iranian();
})();