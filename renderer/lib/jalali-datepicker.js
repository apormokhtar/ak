// lib/jalali-datepicker.js
window.JalaliDatePicker = {
  activeCallback: null,
  activeInput: null,

  show(inputElement, onSelect) {
    this.close();
    this.activeInput = inputElement;
    this.activeCallback = onSelect || function() {};

    let Jalali = window.JalaliHelper;
    let picker = document.createElement('div');
    picker.className = 'jalali-picker';
    picker.id = 'jalali-picker-popup';

    let today = Jalali.todayJalali();
    let currentYear = today.year;
    let currentMonth = today.month;
    let selectedYear = currentYear, selectedMonth = currentMonth, selectedDay = 1;

    let val = inputElement.value || '';
    let parts = val.split('/');
    if (parts.length === 3) {
      selectedYear = parseInt(parts[0]) || currentYear;
      selectedMonth = parseInt(parts[1]) || currentMonth;
      selectedDay = parseInt(parts[2]) || 1;
      currentYear = selectedYear;
      currentMonth = selectedMonth;
    }

    const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

    function render() {
      picker.innerHTML = `
        <div class="jp-header">
          <button class="jp-prev">&lsaquo;</button>
          <div class="jp-title">${monthNames[currentMonth-1]} ${currentYear}</div>
          <button class="jp-next">&rsaquo;</button>
        </div>
        <div class="jp-body">
          <div class="jp-weekdays">
            <span>ش</span><span>ی</span><span>د</span><span>س</span><span>چ</span><span>پ</span><span>ج</span>
          </div>
          <div class="jp-days" id="jp-days-grid"></div>
        </div>
        <div class="jp-footer">
          <button class="jp-today">امروز</button>
          <button class="jp-confirm">تأیید</button>
        </div>`;

      picker.querySelector('.jp-prev').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 1) { currentMonth = 12; currentYear--; }
        render();
      });
      picker.querySelector('.jp-next').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 12) { currentMonth = 1; currentYear++; }
        render();
      });
      picker.querySelector('.jp-today').addEventListener('click', () => {
        currentYear = today.year; currentMonth = today.month; selectedDay = today.day;
        render();
      });
      picker.querySelector('.jp-confirm').addEventListener('click', () => {
        let str = Jalali.formatJalali(currentYear, currentMonth, selectedDay);
        inputElement.value = str;
        if (typeof this.activeCallback === 'function') this.activeCallback(str);
        this.close();
      });

      let daysGrid = picker.querySelector('#jp-days-grid');
      daysGrid.innerHTML = '';
      let firstDayG = Jalali.jalaliToGregorian(currentYear, currentMonth, 1);
      let firstDayDate = new Date(firstDayG.year, firstDayG.month - 1, firstDayG.day);
      let weekDay = firstDayDate.getDay(); // 0 = Sunday, 6 = Saturday
      // Persian calendar week starts Saturday (index 6), so shift:
      let offset = (weekDay + 1) % 7; // Saturday=0, Friday=6

      // Determine days in month
      let nextMonth = currentMonth + 1, nextYear = currentYear;
      if (nextMonth > 12) { nextMonth = 1; nextYear++; }
      let nextMonthFirst = Jalali.jalaliToGregorian(nextYear, nextMonth, 1);
      let nextDate = new Date(nextMonthFirst.year, nextMonthFirst.month - 1, nextMonthFirst.day);
      let diff = (nextDate - firstDayDate) / (1000 * 60 * 60 * 24);
      let daysInMonth = Math.round(diff);

      for (let i = 0; i < offset; i++) {
        let empty = document.createElement('span');
        empty.className = 'jp-day empty';
        daysGrid.appendChild(empty);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        let dayEl = document.createElement('span');
        dayEl.className = 'jp-day';
        dayEl.textContent = d;
        if (d === selectedDay) dayEl.classList.add('selected');
        dayEl.addEventListener('click', () => {
          selectedDay = d;
          render();
        });
        daysGrid.appendChild(dayEl);
      }
    }

    render();
    document.body.appendChild(picker);
    positionPicker(picker, inputElement);

    setTimeout(() => {
      document.addEventListener('click', this._globalClickHandler = (e) => {
        if (!picker.contains(e.target) && e.target !== inputElement) {
          this.close();
        }
      });
    }, 10);
  },

  close() {
    let picker = document.getElementById('jalali-picker-popup');
    if (picker) picker.remove();
    document.removeEventListener('click', this._globalClickHandler);
    this.activeCallback = null;
    this.activeInput = null;
  }
};

function positionPicker(picker, input) {
  picker.style.cssText = `
    position: fixed; z-index: 9999; background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius); box-shadow: var(--shadow); width: 280px; padding: 0;`;
  let rect = input.getBoundingClientRect();
  picker.style.top = (rect.bottom + 4) + 'px';
  picker.style.left = rect.left + 'px';
}