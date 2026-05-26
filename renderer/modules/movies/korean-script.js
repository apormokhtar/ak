// modules/movies/korean-script.js
(function() {
    console.log('اسکریپت کره‌ای بارگذاری شد');

    const DB_NAME = 'MediaCenterDB';
    const STORE_NAME = 'korean_movies';
    let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (db && db.name === DB_NAME) {
            resolve(db);
            return;
        }
        const request = indexedDB.open(DB_NAME, 5);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('iranian_movies')) db.createObjectStore('iranian_movies', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('foreign_movies')) db.createObjectStore('foreign_movies', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('animation_movies')) db.createObjectStore('animation_movies', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('korean_movies')) db.createObjectStore('korean_movies', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('indian_movies')) db.createObjectStore('indian_movies', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('other_movies')) db.createObjectStore('other_movies', { keyPath: 'id' });
        };
    });
}

    async function loadMoviesFromDB() {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    async function saveMovieToDB(movie) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(movie);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async function deleteMovieFromDB(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    const COUNTRIES_LIST = [
        "ایران", "آمریکا", "انگلستان", "فرانسه", "آلمان", "ایتالیا", "اسپانیا", "کانادا", "استرالیا",
        "ژاپن", "کره جنوبی", "هند", "ترکیه", "روسیه", "چین", "برزیل", "مکزیک", "سوئد", "نروژ",
        "دانمارک", "هلند", "بلژیک", "سوئیس", "اتریش", "لهستان", "جمهوری چک", "مجارستان", "رومانی",
        "یونان", "مصر", "اسرائیل", "امارات متحده عربی", "تایلند", "ویتنام", "فیلیپین", "اندونزی",
        "آرژانتین", "شیلی", "کلمبیا", "آفریقای جنوبی", "نیوزیلند", "پرتغال", "فنلاند", "ایرلند", "کرواسی"
    ];

    function populateCountryDropdowns() {
        const filterSelect = document.getElementById('korean-filter-country');
        const movieSelect = document.getElementById('korean-movie-country');
        if (filterSelect) {
            const oldValue = filterSelect.value;
            filterSelect.innerHTML = '<option value="">همه</option>';
            COUNTRIES_LIST.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                filterSelect.appendChild(option);
            });
            if (oldValue && COUNTRIES_LIST.includes(oldValue)) filterSelect.value = oldValue;
        }
        if (movieSelect) {
            const oldValue = movieSelect.value;
            movieSelect.innerHTML = '<option value="">انتخاب کنید</option>';
            COUNTRIES_LIST.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                movieSelect.appendChild(option);
            });
            if (oldValue && COUNTRIES_LIST.includes(oldValue)) movieSelect.value = oldValue;
        }
    }

    let allMovies = [];
    let filteredMovies = [];
    let currentPage = 1;
    const itemsPerPage = 20;
    let currentSort = { field: 'title', order: 'asc' };
    let currentEditId = null;
    let tempPoster = null;

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
    }

    function updatePagination() {
        const totalPages = Math.ceil(filteredMovies.length / itemsPerPage) || 1;
        const container = document.getElementById('korean-pagination-container');
        if (!container) return;
        let html = `<button class="page-btn" onclick="window.changeKoreanPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>قبلی</button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.changeKoreanPage(${i})">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += `<span class="page-dots">...</span>`;
            }
        }
        html += `<button class="page-btn" onclick="window.changeKoreanPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>بعدی</button>`;
        container.innerHTML = html;
    }

    function changeKoreanPage(page) {
        if (page < 1) return;
        const totalPages = Math.ceil(filteredMovies.length / itemsPerPage);
        if (page > totalPages) return;
        currentPage = page;
        renderMoviesTable();
        updatePagination();
    }

    async function refreshMoviesData() {
        allMovies = await loadMoviesFromDB();
        applyFiltersAndSort();
    }

    function applyFiltersAndSort() {
        let filtered = [...allMovies];
        const search = (document.getElementById('korean-movie-search')?.value || '').toLowerCase();
        const countryFilter = document.getElementById('korean-filter-country')?.value || '';
        const languageFilter = document.getElementById('korean-filter-language')?.value || '';
        const genreSelect = document.getElementById('korean-filter-genre');
        let selectedGenres = [];
        if (genreSelect) {
            selectedGenres = Array.from(genreSelect.selectedOptions)
                .filter(opt => opt.value !== '')
                .map(opt => opt.value);
        }

        if (search) {
            filtered = filtered.filter(m =>
                (m.title || '').toLowerCase().includes(search) ||
                (m.titleEn || '').toLowerCase().includes(search)
            );
        }
        if (countryFilter) {
            filtered = filtered.filter(m => (m.country || '') === countryFilter);
        }
        if (languageFilter) {
            if (languageFilter === 'هر دو') {
                filtered = filtered.filter(m => m.language === 'زبان اصلی' || m.language === 'دوبله فارسی');
            } else {
                filtered = filtered.filter(m => (m.language || '') === languageFilter);
            }
        }
        if (selectedGenres.length > 0) {
            filtered = filtered.filter(m => {
                const movieGenres = m.genres || [];
                return selectedGenres.some(genre => movieGenres.includes(genre));
            });
        }

        filtered.sort((a, b) => {
            let valA = a[currentSort.field] || '';
            let valB = b[currentSort.field] || '';
            if (currentSort.field === 'imdb') {
                valA = valA || 0;
                valB = valB || 0;
                return currentSort.order === 'asc' ? valA - valB : valB - valA;
            }
            if (currentSort.field === 'duration') {
                return currentSort.order === 'asc' ? valA - valB : valB - valA;
            }
            valA = String(valA).toLowerCase();
            valB = String(valB).toLowerCase();
            return currentSort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });

        filteredMovies = filtered;
        currentPage = 1;
        renderMoviesTable();
        updatePagination();
    }

    function renderMoviesTable() {
        const start = (currentPage - 1) * itemsPerPage;
        const pageMovies = filteredMovies.slice(start, start + itemsPerPage);
        const tbody = document.querySelector('#korean-movies-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (pageMovies.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">هیچ فیلمی یافت نشد<\/td></td>';
            return;
        }

        pageMovies.forEach(m => {
            const hasPath = m.filePath && m.filePath.trim() !== '';
            const safePath = m.filePath ? m.filePath.replace(/\\/g, '\\\\') : '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${m.poster || ''}" class="thumbnail" onclick="window.enlargeImage('${m.poster}')" onerror="this.style.display='none'"></td>
                <td>${escapeHtml(m.title)}</td>
                <td>${escapeHtml(m.titleEn || '---')}</td>
                <td>${escapeHtml(m.year || '---')}</td>
                <td>${escapeHtml(m.director || '---')}</td>
                <td>${escapeHtml(m.country || '---')}</td>
                <td>${escapeHtml(m.language || '---')}</td>
                <td>${m.duration ? m.duration + ' دقیقه' : '---'}</td>
                <td>${m.imdb || '---'}</td>
                <td class="actions-cell">
                    <button class="action-btn play-btn" ${!hasPath ? 'disabled' : ''} title="پخش فیلم" onclick="window.playMovie('${safePath}')"><i class="fas fa-play"></i></button>
                    <button class="action-btn folder-btn" ${!hasPath ? 'disabled' : ''} title="باز کردن پوشه فیلم" onclick="window.openFolder('${safePath}')"><i class="fas fa-folder-open"></i></button>
                    <button class="action-btn edit-btn" title="ویرایش" onclick="window.showMovieForm('${m.id}')"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" title="حذف" onclick="window.deleteMovie('${m.id}')"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function showMovieForm(editId = null) {
        currentEditId = editId;
        document.getElementById('korean-form-title').innerHTML = editId ? '<i class="fas fa-edit"></i> ویرایش فیلم' : '<i class="fas fa-plus-circle"></i> افزودن فیلم جدید';
        document.getElementById('korean-movie-modal').style.display = 'flex';
        tempPoster = null;
        if (editId) {
            const m = allMovies.find(x => x.id === editId);
            if (m) {
                document.getElementById('korean-movie-title').value = m.title || '';
                document.getElementById('korean-movie-title-en').value = m.titleEn || '';
                document.getElementById('korean-movie-year').value = m.year || '';
                document.getElementById('korean-movie-director').value = m.director || '';
                document.getElementById('korean-movie-writer').value = m.writer || '';
                document.getElementById('korean-movie-cast').value = m.cast || '';
                document.getElementById('korean-movie-duration').value = m.duration || '';
                document.getElementById('korean-movie-country').value = m.country || '';
                document.getElementById('korean-movie-language').value = m.language || '';
                document.getElementById('korean-movie-imdb').value = m.imdb || '';
                document.getElementById('korean-movie-quality').value = m.quality || '';
                document.getElementById('korean-movie-subtitle').value = m.subtitle || '';
                document.getElementById('korean-movie-file').value = m.filePath || '';
                document.getElementById('korean-movie-desc').value = m.desc || '';
                const genres = document.getElementById('korean-movie-genres');
                for (const opt of genres.options) opt.selected = (m.genres || []).includes(opt.value);
                if (m.poster) {
                    tempPoster = m.poster;
                    document.getElementById('korean-poster-preview').src = m.poster;
                    document.getElementById('korean-poster-preview').style.display = 'block';
                }
            }
        } else {
            const fields = ['korean-movie-title', 'korean-movie-title-en', 'korean-movie-year', 'korean-movie-director', 'korean-movie-writer', 'korean-movie-cast', 'korean-movie-duration', 'korean-movie-country', 'korean-movie-language', 'korean-movie-imdb', 'korean-movie-quality', 'korean-movie-subtitle', 'korean-movie-file', 'korean-movie-desc'];
            fields.forEach(id => document.getElementById(id).value = '');
            document.getElementById('korean-movie-genres').selectedIndex = -1;
            document.getElementById('korean-poster-preview').style.display = 'none';
        }
    }

    function closeModal() {
        document.getElementById('korean-movie-modal').style.display = 'none';
        currentEditId = null;
    }

    async function selectMovieFile() {
        if (window.electronAPI && window.electronAPI.selectFile) {
            const file = await window.electronAPI.selectFile();
            if (file) document.getElementById('korean-movie-file').value = file;
        } else {
            Swal.fire('اطلاع', 'این قابلیت فقط در نسخه الکترون فعال است', 'info');
        }
    }

    function previewPoster(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            tempPoster = e.target.result;
            document.getElementById('korean-poster-preview').src = tempPoster;
            document.getElementById('korean-poster-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    async function saveMovie() {
        const title = document.getElementById('korean-movie-title').value.trim();
        if (!title) return Swal.fire('خطا', 'نام فارسی فیلم الزامی است', 'error');
        const genres = Array.from(document.getElementById('korean-movie-genres').selectedOptions).map(o => o.value);
        const movie = {
            id: currentEditId || Date.now().toString(),
            title,
            titleEn: document.getElementById('korean-movie-title-en').value.trim(),
            year: document.getElementById('korean-movie-year').value.trim(),
            director: document.getElementById('korean-movie-director').value.trim(),
            writer: document.getElementById('korean-movie-writer').value.trim(),
            cast: document.getElementById('korean-movie-cast').value.trim(),
            duration: parseInt(document.getElementById('korean-movie-duration').value) || 0,
            country: document.getElementById('korean-movie-country').value,
            language: document.getElementById('korean-movie-language').value,
            imdb: parseFloat(document.getElementById('korean-movie-imdb').value) || null,
            quality: document.getElementById('korean-movie-quality').value.trim(),
            subtitle: document.getElementById('korean-movie-subtitle').value.trim(),
            genres,
            filePath: document.getElementById('korean-movie-file').value.trim(),
            poster: tempPoster || '',
            desc: document.getElementById('korean-movie-desc').value.trim()
        };
        await saveMovieToDB(movie);
        closeModal();
        await refreshMoviesData();
        Swal.fire('موفق', 'فیلم ذخیره شد', 'success');
    }

    async function deleteMovie(id) {
        const result = await Swal.fire({
            title: 'حذف فیلم',
            text: 'آیا از حذف این فیلم اطمینان دارید؟',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'بله',
            cancelButtonText: 'خیر'
        });
        if (!result.isConfirmed) return;
        await deleteMovieFromDB(id);
        await refreshMoviesData();
        Swal.fire('حذف شد', '', 'success');
    }

    async function playMovie(filePath) {
        if (!filePath) return Swal.fire('خطا', 'مسیر فایل وجود ندارد', 'error');
        if (window.electronAPI && window.electronAPI.playFile) {
            await window.electronAPI.playFile(filePath);
        } else {
            Swal.fire('توجه', 'پخش فیلم فقط در نسخه الکترون قابل انجام است', 'info');
        }
    }

    async function openFolder(filePath) {
        if (!filePath) return Swal.fire('خطا', 'مسیر فایل وجود ندارد', 'error');
        if (window.electronAPI && window.electronAPI.openFolder) {
            await window.electronAPI.openFolder(filePath);
        } else {
            Swal.fire('توجه', 'باز کردن پوشه فقط در نسخه الکترون قابل انجام است', 'info');
        }
    }

    function enlargeImage(src) {
        if (!src) return;
        Swal.fire({
            imageUrl: src,
            imageAlt: 'پوستر فیلم',
            showCloseButton: true,
            showConfirmButton: false,
            width: 'auto',
            background: '#000'
        });
    }

    function resetFilters() {
        document.getElementById('korean-filter-country').value = '';
        document.getElementById('korean-filter-language').value = '';
        const genreSelect = document.getElementById('korean-filter-genre');
        if (genreSelect) {
            Array.from(genreSelect.options).forEach(opt => opt.selected = false);
        }
        document.getElementById('korean-movie-search').value = '';
        applyFiltersAndSort();
    }

    function setupSorting() {
        const headers = document.querySelectorAll('#korean-movies-table th[data-sort]');
        headers.forEach(th => {
            th.removeEventListener('click', th._listener);
            const listener = () => {
                const field = th.getAttribute('data-sort');
                if (currentSort.field === field) {
                    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.field = field;
                    currentSort.order = 'asc';
                }
                applyFiltersAndSort();
                headers.forEach(h => {
                    const icon = h.querySelector('i');
                    if (icon) icon.className = 'fas fa-sort';
                });
                const activeIcon = th.querySelector('i');
                if (activeIcon) {
                    activeIcon.className = currentSort.order === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
                }
            };
            th.addEventListener('click', listener);
            th._listener = listener;
        });
    }

    function populateGenreFilter() {
        const genres = ["درام", "کمدی", "ترسناک", "اکشن", "علمی-تخیلی", "عاشقانه", "جنایی", "مستند", "تاریخی", "انیمیشن", "خانوادگی", "ماجراجویی", "فانتزی", "معمایی"];
        const select = document.getElementById('korean-filter-genre');
        if (select) {
            select.innerHTML = '<option value="">همه</option>';
            genres.forEach(g => {
                const option = document.createElement('option');
                option.value = g;
                option.textContent = g;
                select.appendChild(option);
            });
            select.size = Math.min(genres.length + 1, 5);
        }
    }

    function attachEvents() {
        const addBtn = document.getElementById('korean-add-movie-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => showMovieForm());
            console.log('دکمه افزودن فیلم کره‌ای به رویداد متصل شد');
        } else {
            console.error('دکمه korean-add-movie-btn پیدا نشد!');
        }
        document.getElementById('korean-reset-filters-btn')?.addEventListener('click', () => resetFilters());
        document.getElementById('korean-select-file-btn')?.addEventListener('click', () => selectMovieFile());
        document.getElementById('korean-save-movie-btn')?.addEventListener('click', () => saveMovie());
        document.getElementById('korean-close-modal-btn')?.addEventListener('click', () => closeModal());
        document.getElementById('korean-movie-poster')?.addEventListener('change', e => previewPoster(e));
        document.getElementById('korean-movie-search')?.addEventListener('input', () => applyFiltersAndSort());
        document.getElementById('korean-filter-country')?.addEventListener('change', () => applyFiltersAndSort());
        document.getElementById('korean-filter-language')?.addEventListener('change', () => applyFiltersAndSort());
        document.getElementById('korean-filter-genre')?.addEventListener('change', () => applyFiltersAndSort());
    }

    async function init_movies_korean() {
        console.log('شروع راه‌اندازی صفحه فیلم‌های کره‌ای...');
        populateCountryDropdowns();
        populateGenreFilter();
        await refreshMoviesData();

        if (allMovies.length === 0) {
            console.log('دیتابیس خالی است، افزودن فیلم‌های نمونه...');
            const sampleMovies = [
                { id: Date.now().toString(), title: "انگل", titleEn: "Parasite", year: "2019", director: "بونگ جون-هو", writer: "بونگ جون-هو، هان جین-وون", cast: "سونگ کانگ-هو، لی سون-کیون", duration: 132, country: "کره جنوبی", language: "زبان اصلی", imdb: 8.6, quality: "1080p", subtitle: "فارسی، انگلیسی", genres: ["درام", "جنایی"], filePath: "", poster: "", desc: "" },
                { id: (Date.now()+1).toString(), title: "میزبان", titleEn: "The Host", year: "2006", director: "بونگ جون-هو", writer: "بونگ جون-هو", cast: "سونگ کانگ-هو، بیون هی-بونگ", duration: 119, country: "کره جنوبی", language: "دوبله فارسی", imdb: 7.1, quality: "1080p", subtitle: "فارسی", genres: ["ترسناک", "اکشن"], filePath: "", poster: "", desc: "" }
            ];
            for (const movie of sampleMovies) await saveMovieToDB(movie);
            await refreshMoviesData();
        }

        setupSorting();
        attachEvents();
        console.log('راه‌اندازی فیلم‌های کره‌ای کامل شد');
    }

    window.showMovieForm = showMovieForm;
    window.closeModal = closeModal;
    window.selectMovieFile = selectMovieFile;
    window.previewPoster = previewPoster;
    window.saveMovie = saveMovie;
    window.deleteMovie = deleteMovie;
    window.playMovie = playMovie;
    window.openFolder = openFolder;
    window.enlargeImage = enlargeImage;
    window.resetFilters = resetFilters;
    window.changeKoreanPage = changeKoreanPage;
    window.init_movies_korean = init_movies_korean;

    console.log('توابع به window الصاق شدند. init_movies_korean وجود دارد:', typeof window.init_movies_korean);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init_movies_korean);
    } else {
        init_movies_korean();
    }
})();