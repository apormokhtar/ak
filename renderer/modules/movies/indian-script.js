// modules/movies/indian-script.js
(function() {
    console.log('اسکریپت هندی بارگذاری شد');

    const DB_NAME = 'MediaCenterDB';
    const STORE_NAME = 'indian_movies';
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
        const filterSelect = document.getElementById('indian-filter-country');
        const movieSelect = document.getElementById('indian-movie-country');
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
        const container = document.getElementById('indian-pagination-container');
        if (!container) return;
        let html = `<button class="page-btn" onclick="window.changeIndianPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>قبلی</button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="window.changeIndianPage(${i})">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += `<span class="page-dots">...</span>`;
            }
        }
        html += `<button class="page-btn" onclick="window.changeIndianPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>بعدی</button>`;
        container.innerHTML = html;
    }

    function changeIndianPage(page) {
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
        const search = (document.getElementById('indian-movie-search')?.value || '').toLowerCase();
        const countryFilter = document.getElementById('indian-filter-country')?.value || '';
        const languageFilter = document.getElementById('indian-filter-language')?.value || '';
        const genreSelect = document.getElementById('indian-filter-genre');
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
        const tbody = document.querySelector('#indian-movies-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (pageMovies.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">هیچ فیلمی یافت نشد<\/td></tr>';
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
        document.getElementById('indian-form-title').innerHTML = editId ? '<i class="fas fa-edit"></i> ویرایش فیلم' : '<i class="fas fa-plus-circle"></i> افزودن فیلم جدید';
        document.getElementById('indian-movie-modal').style.display = 'flex';
        tempPoster = null;
        if (editId) {
            const m = allMovies.find(x => x.id === editId);
            if (m) {
                document.getElementById('indian-movie-title').value = m.title || '';
                document.getElementById('indian-movie-title-en').value = m.titleEn || '';
                document.getElementById('indian-movie-year').value = m.year || '';
                document.getElementById('indian-movie-director').value = m.director || '';
                document.getElementById('indian-movie-writer').value = m.writer || '';
                document.getElementById('indian-movie-cast').value = m.cast || '';
                document.getElementById('indian-movie-duration').value = m.duration || '';
                document.getElementById('indian-movie-country').value = m.country || '';
                document.getElementById('indian-movie-language').value = m.language || '';
                document.getElementById('indian-movie-imdb').value = m.imdb || '';
                document.getElementById('indian-movie-quality').value = m.quality || '';
                document.getElementById('indian-movie-subtitle').value = m.subtitle || '';
                document.getElementById('indian-movie-file').value = m.filePath || '';
                document.getElementById('indian-movie-desc').value = m.desc || '';
                const genres = document.getElementById('indian-movie-genres');
                for (const opt of genres.options) opt.selected = (m.genres || []).includes(opt.value);
                if (m.poster) {
                    tempPoster = m.poster;
                    document.getElementById('indian-poster-preview').src = m.poster;
                    document.getElementById('indian-poster-preview').style.display = 'block';
                }
            }
        } else {
            const fields = ['indian-movie-title', 'indian-movie-title-en', 'indian-movie-year', 'indian-movie-director', 'indian-movie-writer', 'indian-movie-cast', 'indian-movie-duration', 'indian-movie-country', 'indian-movie-language', 'indian-movie-imdb', 'indian-movie-quality', 'indian-movie-subtitle', 'indian-movie-file', 'indian-movie-desc'];
            fields.forEach(id => document.getElementById(id).value = '');
            document.getElementById('indian-movie-genres').selectedIndex = -1;
            document.getElementById('indian-poster-preview').style.display = 'none';
        }
    }

    function closeModal() {
        document.getElementById('indian-movie-modal').style.display = 'none';
        currentEditId = null;
    }

    async function selectMovieFile() {
        if (window.electronAPI && window.electronAPI.selectFile) {
            const file = await window.electronAPI.selectFile();
            if (file) document.getElementById('indian-movie-file').value = file;
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
            document.getElementById('indian-poster-preview').src = tempPoster;
            document.getElementById('indian-poster-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    async function saveMovie() {
        const title = document.getElementById('indian-movie-title').value.trim();
        if (!title) return Swal.fire('خطا', 'نام فارسی فیلم الزامی است', 'error');
        const genres = Array.from(document.getElementById('indian-movie-genres').selectedOptions).map(o => o.value);
        const movie = {
            id: currentEditId || Date.now().toString(),
            title,
            titleEn: document.getElementById('indian-movie-title-en').value.trim(),
            year: document.getElementById('indian-movie-year').value.trim(),
            director: document.getElementById('indian-movie-director').value.trim(),
            writer: document.getElementById('indian-movie-writer').value.trim(),
            cast: document.getElementById('indian-movie-cast').value.trim(),
            duration: parseInt(document.getElementById('indian-movie-duration').value) || 0,
            country: document.getElementById('indian-movie-country').value,
            language: document.getElementById('indian-movie-language').value,
            imdb: parseFloat(document.getElementById('indian-movie-imdb').value) || null,
            quality: document.getElementById('indian-movie-quality').value.trim(),
            subtitle: document.getElementById('indian-movie-subtitle').value.trim(),
            genres,
            filePath: document.getElementById('indian-movie-file').value.trim(),
            poster: tempPoster || '',
            desc: document.getElementById('indian-movie-desc').value.trim()
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
        document.getElementById('indian-filter-country').value = '';
        document.getElementById('indian-filter-language').value = '';
        const genreSelect = document.getElementById('indian-filter-genre');
        if (genreSelect) {
            Array.from(genreSelect.options).forEach(opt => opt.selected = false);
        }
        document.getElementById('indian-movie-search').value = '';
        applyFiltersAndSort();
    }

    function setupSorting() {
        const headers = document.querySelectorAll('#indian-movies-table th[data-sort]');
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
        const select = document.getElementById('indian-filter-genre');
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
        const addBtn = document.getElementById('indian-add-movie-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => showMovieForm());
            console.log('دکمه افزودن فیلم هندی به رویداد متصل شد');
        } else {
            console.error('دکمه indian-add-movie-btn پیدا نشد!');
        }
        document.getElementById('indian-reset-filters-btn')?.addEventListener('click', () => resetFilters());
        document.getElementById('indian-select-file-btn')?.addEventListener('click', () => selectMovieFile());
        document.getElementById('indian-save-movie-btn')?.addEventListener('click', () => saveMovie());
        document.getElementById('indian-close-modal-btn')?.addEventListener('click', () => closeModal());
        document.getElementById('indian-movie-poster')?.addEventListener('change', e => previewPoster(e));
        document.getElementById('indian-movie-search')?.addEventListener('input', () => applyFiltersAndSort());
        document.getElementById('indian-filter-country')?.addEventListener('change', () => applyFiltersAndSort());
        document.getElementById('indian-filter-language')?.addEventListener('change', () => applyFiltersAndSort());
        document.getElementById('indian-filter-genre')?.addEventListener('change', () => applyFiltersAndSort());
    }

    async function init_movies_indian() {
        console.log('شروع راه‌اندازی صفحه فیلم‌های هندی...');
        populateCountryDropdowns();
        populateGenreFilter();
        await refreshMoviesData();

        if (allMovies.length === 0) {
            console.log('دیتابیس خالی است، افزودن فیلم‌های نمونه...');
            const sampleMovies = [
                { id: Date.now().toString(), title: "سه احمق", titleEn: "3 Idiots", year: "2009", director: "راجکومار هیرانی", writer: "راجکومار هیرانی، ویدهو وینود چوپرا", cast: "عامر خان، مدهون، شرمن جوشی", duration: 170, country: "هند", language: "زبان اصلی", imdb: 8.4, quality: "1080p", subtitle: "فارسی", genres: ["کمدی", "درام"], filePath: "", poster: "", desc: "" }
            ];
            for (const movie of sampleMovies) await saveMovieToDB(movie);
            await refreshMoviesData();
        }

        setupSorting();
        attachEvents();
        console.log('راه‌اندازی فیلم‌های هندی کامل شد');
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
    window.changeIndianPage = changeIndianPage;
    window.init_movies_indian = init_movies_indian;

    console.log('توابع به window الصاق شدند. init_movies_indian وجود دارد:', typeof window.init_movies_indian);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init_movies_indian);
    } else {
        init_movies_indian();
    }
})();